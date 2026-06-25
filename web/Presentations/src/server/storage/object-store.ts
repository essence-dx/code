import { Buffer } from "node:buffer"
import { createHash, createHmac } from "node:crypto"

import {
  getAssetStorageAccessKeyId,
  getAssetStorageBucket,
  getAssetStorageDeleteStaleObjects,
  getAssetStorageEndpoint,
  getAssetStorageMinBytes,
  getAssetStoragePrefix,
  getAssetStorageProvider,
  getAssetStorageRegion,
  getAssetStorageSecretAccessKey,
} from "@/server/env"

type ObjectStoreConfig = {
  accessKeyId: string
  bucket: string
  endpoint: URL
  minBytes: number
  prefix: string
  provider: "s3"
  region: string
  secretAccessKey: string
}

type StoredObject = {
  bytes: Buffer
  mimeType: string
}

export type DeleteAssetObjectsResult = {
  deletedKeys: string[]
  retainedKeys: string[]
}

function hashHex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex")
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest()
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex")
}

function isoAmzDate(value: Date) {
  return value.toISOString().replace(/[:-]|\.\d{3}/g, "")
}

function keyPath(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/")
}

function cleanPath(value: string) {
  return value.replace(/\/+$/, "")
}

function canonicalHeaders(headers: Record<string, string>) {
  const keys = Object.keys(headers).sort()

  return {
    canonical: keys.map((key) => `${key}:${headers[key].trim()}\n`).join(""),
    signed: keys.join(";"),
  }
}

function signingKey(config: ObjectStoreConfig, dateStamp: string) {
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp)
  const regionKey = hmac(dateKey, config.region)
  const serviceKey = hmac(regionKey, "s3")

  return hmac(serviceKey, "aws4_request")
}

function objectUrl(config: ObjectStoreConfig, key: string) {
  const url = new URL(config.endpoint)
  const basePath = cleanPath(url.pathname)
  url.pathname = `${basePath}/${encodeURIComponent(config.bucket)}/${keyPath(key)}`

  return url
}

function signedRequest(input: {
  body?: Buffer
  config: ObjectStoreConfig
  contentType?: string
  method: "DELETE" | "GET" | "PUT"
  url: URL
}) {
  const now = new Date()
  const amzDate = isoAmzDate(now)
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = hashHex(input.body ?? "")
  const headers: Record<string, string> = {
    host: input.url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  }

  if (input.contentType) {
    headers["content-type"] = input.contentType
  }

  const canonical = canonicalHeaders(headers)
  const canonicalRequest = [
    input.method,
    input.url.pathname,
    input.url.searchParams.toString(),
    canonical.canonical,
    canonical.signed,
    payloadHash,
  ].join("\n")
  const scope = `${dateStamp}/${input.config.region}/s3/aws4_request`
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    hashHex(canonicalRequest),
  ].join("\n")
  const signature = hmacHex(signingKey(input.config, dateStamp), stringToSign)

  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${input.config.accessKeyId}/${scope}, SignedHeaders=${canonical.signed}, Signature=${signature}`,
  }
}

function readObjectStoreConfig(): ObjectStoreConfig | null {
  if (getAssetStorageProvider() !== "s3") return null

  const endpoint = getAssetStorageEndpoint()
  const bucket = getAssetStorageBucket()
  const accessKeyId = getAssetStorageAccessKeyId()
  const secretAccessKey = getAssetStorageSecretAccessKey()
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null

  let endpointUrl: URL
  try {
    endpointUrl = new URL(endpoint)
  } catch {
    return null
  }

  return {
    accessKeyId,
    bucket,
    endpoint: endpointUrl,
    minBytes: getAssetStorageMinBytes(),
    prefix: getAssetStoragePrefix(),
    provider: "s3",
    region: getAssetStorageRegion(),
    secretAccessKey,
  }
}

export function objectStoreMinBytes() {
  return readObjectStoreConfig()?.minBytes ?? Number.POSITIVE_INFINITY
}

export function objectStoreEnabled() {
  return Boolean(readObjectStoreConfig())
}

export function deckAssetObjectKey(input: { assetId: string; deckId: string }) {
  const prefix = getAssetStoragePrefix().replace(/^\/+|\/+$/g, "")

  return `${prefix}/${input.deckId}/${input.assetId}`
}

export async function putAssetObject(input: {
  bytes: Buffer
  key: string
  mimeType: string
}) {
  const config = readObjectStoreConfig()
  if (!config) return false

  const url = objectUrl(config, input.key)
  const response = await fetch(url, {
    method: "PUT",
    headers: signedRequest({
      body: input.bytes,
      config,
      contentType: input.mimeType,
      method: "PUT",
      url,
    }),
    body: input.bytes.buffer.slice(
      input.bytes.byteOffset,
      input.bytes.byteOffset + input.bytes.byteLength,
    ) as ArrayBuffer,
  })

  if (!response.ok) {
    throw new Error(`asset-object-put-failed:${response.status}`)
  }

  return true
}

export async function getAssetObject(input: {
  key: string
  mimeType: string
}): Promise<StoredObject | null> {
  const config = readObjectStoreConfig()
  if (!config) return null

  const url = objectUrl(config, input.key)
  const response = await fetch(url, {
    method: "GET",
    headers: signedRequest({ config, method: "GET", url }),
  })

  if (!response.ok) return null

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") ?? input.mimeType,
  }
}

export async function deleteAssetObject(key: string) {
  const config = readObjectStoreConfig()
  if (!config) return

  const url = objectUrl(config, key)
  await fetch(url, {
    method: "DELETE",
    headers: signedRequest({ config, method: "DELETE", url }),
  }).catch(() => undefined)
}

export async function deleteAssetObjects(keys: string[]) {
  const uniqueKeys = [...new Set(keys)].filter(Boolean)
  if (!getAssetStorageDeleteStaleObjects()) {
    return {
      deletedKeys: [],
      retainedKeys: uniqueKeys,
    } satisfies DeleteAssetObjectsResult
  }

  await Promise.all(uniqueKeys.map((key) => deleteAssetObject(key)))

  return {
    deletedKeys: uniqueKeys,
    retainedKeys: [],
  } satisfies DeleteAssetObjectsResult
}
