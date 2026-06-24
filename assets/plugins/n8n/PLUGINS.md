# n8n PLUGINS.md

## Project Overview

n8n is a workflow automation platform built as a TypeScript monorepo managed by pnpm workspaces. This document catalogs all n8n node implementations (plugins) available in the project.

- **Version:** 2.28.0
- **Package Manager:** pnpm >= 10.22.0
- **Node:** >= 22.22
- **Monorepo Tool:** Turborepo

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run n8n
pnpm start

# Or run directly with n8n CLI
packages/cli/bin/n8n start
```

## Running the Built Project

```bash
# Start n8n server
pnpm start
```

This executes: `node scripts/os-normalize.mjs --dir packages/cli/bin n8n`

### Other run commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development mode with hot reload |
| `pnpm dev:be` | Start backend-only development |
| `pnpm start` | Start n8n production server |
| `./packages/cli/bin/n8n webhook` | Run webhook process |
| `./packages/cli/bin/n8n worker` | Run worker process |
| `pnpm dev:ai` | Development mode with AI nodes |

### Building

```bash
pnpm build                    # Build all packages
pnpm build:unchecked          # Build without type checking
pnpm build:n8n                # Build n8n specifically
```

### Environment Setup

Copy `.env.local.example` to `.env.local` and configure your environment variables before running.

---

## Node Packages

Nodes are distributed across two packages within the monorepo:

### 1. `n8n-nodes-base` (`packages/nodes-base/`)

The main integration nodes package containing **439 registered node classes** (540 source `.node.ts` files). These are the core workflow nodes covering integrations with hundreds of services.

- **Source directory:** `packages/nodes-base/nodes/`
- **Build output:** `packages/nodes-base/dist/nodes/`
- **Registration:** `packages/nodes-base/package.json` > `n8n.nodes`

### 2. `@n8n/n8n-nodes-langchain` (`packages/@n8n/nodes-langchain/`)

AI and LangChain integration nodes containing **122 registered node classes** (135 source `.node.ts` files). These cover LLM providers, vector stores, AI agents, tools, memory, embeddings, and more.

- **Source directory:** `packages/@n8n/nodes-langchain/nodes/`
- **Build output:** `packages/@n8n/nodes-langchain/dist/nodes/`
- **Registration:** `packages/@n8n/nodes-langchain/package.json` > `n8n.nodes`

---

## Full Node Listing

### n8n-nodes-base (439 registered nodes)

Source path: `packages/nodes-base/nodes/<NodeName>/<NodeFile>.node.ts`

#### A
| Node | Source Path |
|------|------------|
| ActionNetwork | `packages/nodes-base/nodes/ActionNetwork/ActionNetwork.node.ts` |
| ActiveCampaign | `packages/nodes-base/nodes/ActiveCampaign/ActiveCampaign.node.ts` |
| ActiveCampaignTrigger | `packages/nodes-base/nodes/ActiveCampaign/ActiveCampaignTrigger.node.ts` |
| AcuitySchedulingTrigger | `packages/nodes-base/nodes/AcuityScheduling/AcuitySchedulingTrigger.node.ts` |
| Adalo | `packages/nodes-base/nodes/Adalo/Adalo.node.ts` |
| Affinity | `packages/nodes-base/nodes/Affinity/Affinity.node.ts` |
| AffinityTrigger | `packages/nodes-base/nodes/Affinity/AffinityTrigger.node.ts` |
| AgileCrm | `packages/nodes-base/nodes/AgileCrm/AgileCrm.node.ts` |
| AiTransform | `packages/nodes-base/nodes/AiTransform/AiTransform.node.ts` |
| Airtable | `packages/nodes-base/nodes/Airtable/Airtable.node.ts` |
| AirtableTrigger | `packages/nodes-base/nodes/Airtable/AirtableTrigger.node.ts` |
| Airtop | `packages/nodes-base/nodes/Airtop/Airtop.node.ts` |
| Amqp | `packages/nodes-base/nodes/Amqp/Amqp.node.ts` |
| AmqpTrigger | `packages/nodes-base/nodes/Amqp/AmqpTrigger.node.ts` |
| ApiTemplateIo | `packages/nodes-base/nodes/ApiTemplateIo/ApiTemplateIo.node.ts` |
| Asana | `packages/nodes-base/nodes/Asana/Asana.node.ts` |
| AsanaTrigger | `packages/nodes-base/nodes/Asana/AsanaTrigger.node.ts` |
| Autopilot | `packages/nodes-base/nodes/Autopilot/Autopilot.node.ts` |
| AutopilotTrigger | `packages/nodes-base/nodes/Autopilot/AutopilotTrigger.node.ts` |
| AwsLambda | `packages/nodes-base/nodes/Aws/AwsLambda.node.ts` |
| AwsSns | `packages/nodes-base/nodes/Aws/AwsSns.node.ts` |
| AwsSnsTrigger | `packages/nodes-base/nodes/Aws/AwsSnsTrigger.node.ts` |
| AwsCertificateManager | `packages/nodes-base/nodes/Aws/CertificateManager/AwsCertificateManager.node.ts` |
| AwsCognito | `packages/nodes-base/nodes/Aws/Cognito/AwsCognito.node.ts` |
| AwsComprehend | `packages/nodes-base/nodes/Aws/Comprehend/AwsComprehend.node.ts` |
| AwsDynamoDB | `packages/nodes-base/nodes/Aws/DynamoDB/AwsDynamoDB.node.ts` |
| AwsElb | `packages/nodes-base/nodes/Aws/ELB/AwsElb.node.ts` |
| AwsIam | `packages/nodes-base/nodes/Aws/IAM/AwsIam.node.ts` |
| AwsRekognition | `packages/nodes-base/nodes/Aws/Rekognition/AwsRekognition.node.ts` |
| AwsS3 | `packages/nodes-base/nodes/Aws/S3/AwsS3.node.ts` |
| AwsSes | `packages/nodes-base/nodes/Aws/SES/AwsSes.node.ts` |
| AwsSqs | `packages/nodes-base/nodes/Aws/SQS/AwsSqs.node.ts` |
| AwsTextract | `packages/nodes-base/nodes/Aws/Textract/AwsTextract.node.ts` |
| AwsTranscribe | `packages/nodes-base/nodes/Aws/Transcribe/AwsTranscribe.node.ts` |

#### B
| Node | Source Path |
|------|------------|
| BambooHr | `packages/nodes-base/nodes/BambooHr/BambooHr.node.ts` |
| Bannerbear | `packages/nodes-base/nodes/Bannerbear/Bannerbear.node.ts` |
| Baserow | `packages/nodes-base/nodes/Baserow/Baserow.node.ts` |
| Beeminder | `packages/nodes-base/nodes/Beeminder/Beeminder.node.ts` |
| BitbucketTrigger | `packages/nodes-base/nodes/Bitbucket/BitbucketTrigger.node.ts` |
| Bitly | `packages/nodes-base/nodes/Bitly/Bitly.node.ts` |
| Bitwarden | `packages/nodes-base/nodes/Bitwarden/Bitwarden.node.ts` |
| Box | `packages/nodes-base/nodes/Box/Box.node.ts` |
| BoxTrigger | `packages/nodes-base/nodes/Box/BoxTrigger.node.ts` |
| Brandfetch | `packages/nodes-base/nodes/Brandfetch/Brandfetch.node.ts` |
| Brevo | `packages/nodes-base/nodes/Brevo/Brevo.node.ts` |
| BrevoTrigger | `packages/nodes-base/nodes/Brevo/BrevoTrigger.node.ts` |
| Bubble | `packages/nodes-base/nodes/Bubble/Bubble.node.ts` |

#### C
| Node | Source Path |
|------|------------|
| CalTrigger | `packages/nodes-base/nodes/Cal/CalTrigger.node.ts` |
| CalendlyTrigger | `packages/nodes-base/nodes/Calendly/CalendlyTrigger.node.ts` |
| Chargebee | `packages/nodes-base/nodes/Chargebee/Chargebee.node.ts` |
| ChargebeeTrigger | `packages/nodes-base/nodes/Chargebee/ChargebeeTrigger.node.ts` |
| CircleCi | `packages/nodes-base/nodes/CircleCi/CircleCi.node.ts` |
| CiscoWebex | `packages/nodes-base/nodes/Cisco/Webex/CiscoWebex.node.ts` |
| CiscoWebexTrigger | `packages/nodes-base/nodes/Cisco/Webex/CiscoWebexTrigger.node.ts` |
| Clearbit | `packages/nodes-base/nodes/Clearbit/Clearbit.node.ts` |
| ClickUp | `packages/nodes-base/nodes/ClickUp/ClickUp.node.ts` |
| ClickUpTrigger | `packages/nodes-base/nodes/ClickUp/ClickUpTrigger.node.ts` |
| Clockify | `packages/nodes-base/nodes/Clockify/Clockify.node.ts` |
| ClockifyTrigger | `packages/nodes-base/nodes/Clockify/ClockifyTrigger.node.ts` |
| Cloudflare | `packages/nodes-base/nodes/Cloudflare/Cloudflare.node.ts` |
| Cockpit | `packages/nodes-base/nodes/Cockpit/Cockpit.node.ts` |
| Coda | `packages/nodes-base/nodes/Coda/Coda.node.ts` |
| Code | `packages/nodes-base/nodes/Code/Code.node.ts` |
| CoinGecko | `packages/nodes-base/nodes/CoinGecko/CoinGecko.node.ts` |
| CompareDatasets | `packages/nodes-base/nodes/CompareDatasets/CompareDatasets.node.ts` |
| Compression | `packages/nodes-base/nodes/Compression/Compression.node.ts` |
| Contentful | `packages/nodes-base/nodes/Contentful/Contentful.node.ts` |
| ConvertKit | `packages/nodes-base/nodes/ConvertKit/ConvertKit.node.ts` |
| ConvertKitTrigger | `packages/nodes-base/nodes/ConvertKit/ConvertKitTrigger.node.ts` |
| Copper | `packages/nodes-base/nodes/Copper/Copper.node.ts` |
| CopperTrigger | `packages/nodes-base/nodes/Copper/CopperTrigger.node.ts` |
| Cortex | `packages/nodes-base/nodes/Cortex/Cortex.node.ts` |
| CrateDb | `packages/nodes-base/nodes/CrateDb/CrateDb.node.ts` |
| Cron | `packages/nodes-base/nodes/Cron/Cron.node.ts` |
| Crypto | `packages/nodes-base/nodes/Crypto/Crypto.node.ts` |
| Currents | `packages/nodes-base/nodes/Currents/Currents.node.ts` |
| CurrentsTrigger | `packages/nodes-base/nodes/Currents/CurrentsTrigger.node.ts` |
| CustomerIo | `packages/nodes-base/nodes/CustomerIo/CustomerIo.node.ts` |
| CustomerIoTrigger | `packages/nodes-base/nodes/CustomerIo/CustomerIoTrigger.node.ts` |

#### D
| Node | Source Path |
|------|------------|
| DataTable | `packages/nodes-base/nodes/DataTable/DataTable.node.ts` |
| Databricks | `packages/nodes-base/nodes/Databricks/Databricks.node.ts` |
| DateTime | `packages/nodes-base/nodes/DateTime/DateTime.node.ts` |
| DebugHelper | `packages/nodes-base/nodes/DebugHelper/DebugHelper.node.ts` |
| DeepL | `packages/nodes-base/nodes/DeepL/DeepL.node.ts` |
| Demio | `packages/nodes-base/nodes/Demio/Demio.node.ts` |
| Dhl | `packages/nodes-base/nodes/Dhl/Dhl.node.ts` |
| Discord | `packages/nodes-base/nodes/Discord/Discord.node.ts` |
| Discourse | `packages/nodes-base/nodes/Discourse/Discourse.node.ts` |
| Disqus | `packages/nodes-base/nodes/Disqus/Disqus.node.ts` |
| Drift | `packages/nodes-base/nodes/Drift/Drift.node.ts` |
| Dropbox | `packages/nodes-base/nodes/Dropbox/Dropbox.node.ts` |
| Dropcontact | `packages/nodes-base/nodes/Dropcontact/Dropcontact.node.ts` |
| DynamicCredentialCheck | `packages/nodes-base/nodes/DynamicCredentialCheck/DynamicCredentialCheck.node.ts` |

#### E
| Node | Source Path |
|------|------------|
| E2eTest | `packages/nodes-base/nodes/E2eTest/E2eTest.node.ts` |
| ERPNext | `packages/nodes-base/nodes/ERPNext/ERPNext.node.ts` |
| EditImage | `packages/nodes-base/nodes/EditImage/EditImage.node.ts` |
| Egoi | `packages/nodes-base/nodes/Egoi/Egoi.node.ts` |
| ElasticSecurity | `packages/nodes-base/nodes/Elastic/ElasticSecurity/ElasticSecurity.node.ts` |
| Elasticsearch | `packages/nodes-base/nodes/Elastic/Elasticsearch/Elasticsearch.node.ts` |
| EmailReadImap | `packages/nodes-base/nodes/EmailReadImap/EmailReadImap.node.ts` |
| EmailSend | `packages/nodes-base/nodes/EmailSend/EmailSend.node.ts` |
| Emelia | `packages/nodes-base/nodes/Emelia/Emelia.node.ts` |
| EmeliaTrigger | `packages/nodes-base/nodes/Emelia/EmeliaTrigger.node.ts` |
| ErrorTrigger | `packages/nodes-base/nodes/ErrorTrigger/ErrorTrigger.node.ts` |
| Evaluation (EE) | `packages/nodes-base/nodes/Evaluation/Evaluation/Evaluation.node.ee.ts` |
| EvaluationTrigger (EE) | `packages/nodes-base/nodes/Evaluation/EvaluationTrigger/EvaluationTrigger.node.ee.ts` |
| EventbriteTrigger | `packages/nodes-base/nodes/Eventbrite/EventbriteTrigger.node.ts` |
| ExecuteCommand | `packages/nodes-base/nodes/ExecuteCommand/ExecuteCommand.node.ts` |
| ExecuteWorkflow | `packages/nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node.ts` |
| ExecuteWorkflowTrigger | `packages/nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node.ts` |
| ExecutionData | `packages/nodes-base/nodes/ExecutionData/ExecutionData.node.ts` |

#### F
| Node | Source Path |
|------|------------|
| FacebookGraphApi | `packages/nodes-base/nodes/Facebook/FacebookGraphApi.node.ts` |
| FacebookTrigger | `packages/nodes-base/nodes/Facebook/FacebookTrigger.node.ts` |
| FacebookLeadAdsTrigger | `packages/nodes-base/nodes/FacebookLeadAds/FacebookLeadAdsTrigger.node.ts` |
| FigmaTrigger | `packages/nodes-base/nodes/Figma/FigmaTrigger.node.ts` |
| FileMaker | `packages/nodes-base/nodes/FileMaker/FileMaker.node.ts` |
| ConvertToFile | `packages/nodes-base/nodes/Files/ConvertToFile/ConvertToFile.node.ts` |
| ExtractFromFile | `packages/nodes-base/nodes/Files/ExtractFromFile/ExtractFromFile.node.ts` |
| ReadWriteFile | `packages/nodes-base/nodes/Files/ReadWriteFile/ReadWriteFile.node.ts` |
| Filter | `packages/nodes-base/nodes/Filter/Filter.node.ts` |
| Flow | `packages/nodes-base/nodes/Flow/Flow.node.ts` |
| FlowTrigger | `packages/nodes-base/nodes/Flow/FlowTrigger.node.ts` |
| Form | `packages/nodes-base/nodes/Form/Form.node.ts` |
| FormTrigger | `packages/nodes-base/nodes/Form/FormTrigger.node.ts` |
| FormIoTrigger | `packages/nodes-base/nodes/FormIo/FormIoTrigger.node.ts` |
| FormstackTrigger | `packages/nodes-base/nodes/Formstack/FormstackTrigger.node.ts` |
| Freshdesk | `packages/nodes-base/nodes/Freshdesk/Freshdesk.node.ts` |
| Freshservice | `packages/nodes-base/nodes/Freshservice/Freshservice.node.ts` |
| FreshworksCrm | `packages/nodes-base/nodes/FreshworksCrm/FreshworksCrm.node.ts` |
| Ftp | `packages/nodes-base/nodes/Ftp/Ftp.node.ts` |
| Function | `packages/nodes-base/nodes/Function/Function.node.ts` |
| FunctionItem | `packages/nodes-base/nodes/FunctionItem/FunctionItem.node.ts` |

#### G
| Node | Source Path |
|------|------------|
| GetResponse | `packages/nodes-base/nodes/GetResponse/GetResponse.node.ts` |
| GetResponseTrigger | `packages/nodes-base/nodes/GetResponse/GetResponseTrigger.node.ts` |
| Ghost | `packages/nodes-base/nodes/Ghost/Ghost.node.ts` |
| Git | `packages/nodes-base/nodes/Git/Git.node.ts` |
| Github | `packages/nodes-base/nodes/Github/Github.node.ts` |
| GithubTrigger | `packages/nodes-base/nodes/Github/GithubTrigger.node.ts` |
| Gitlab | `packages/nodes-base/nodes/Gitlab/Gitlab.node.ts` |
| GitlabTrigger | `packages/nodes-base/nodes/Gitlab/GitlabTrigger.node.ts` |
| Gong | `packages/nodes-base/nodes/Gong/Gong.node.ts` |
| GoogleAds | `packages/nodes-base/nodes/Google/Ads/GoogleAds.node.ts` |
| GoogleAnalytics | `packages/nodes-base/nodes/Google/Analytics/GoogleAnalytics.node.ts` |
| GoogleBigQuery | `packages/nodes-base/nodes/Google/BigQuery/GoogleBigQuery.node.ts` |
| GoogleBooks | `packages/nodes-base/nodes/Google/Books/GoogleBooks.node.ts` |
| GoogleBusinessProfile | `packages/nodes-base/nodes/Google/BusinessProfile/GoogleBusinessProfile.node.ts` |
| GoogleBusinessProfileTrigger | `packages/nodes-base/nodes/Google/BusinessProfile/GoogleBusinessProfileTrigger.node.ts` |
| GoogleCalendar | `packages/nodes-base/nodes/Google/Calendar/GoogleCalendar.node.ts` |
| GoogleCalendarTrigger | `packages/nodes-base/nodes/Google/Calendar/GoogleCalendarTrigger.node.ts` |
| GoogleChat | `packages/nodes-base/nodes/Google/Chat/GoogleChat.node.ts` |
| GoogleCloudNaturalLanguage | `packages/nodes-base/nodes/Google/CloudNaturalLanguage/GoogleCloudNaturalLanguage.node.ts` |
| GoogleCloudStorage | `packages/nodes-base/nodes/Google/CloudStorage/GoogleCloudStorage.node.ts` |
| GoogleContacts | `packages/nodes-base/nodes/Google/Contacts/GoogleContacts.node.ts` |
| GoogleDocs | `packages/nodes-base/nodes/Google/Docs/GoogleDocs.node.ts` |
| GoogleDrive | `packages/nodes-base/nodes/Google/Drive/GoogleDrive.node.ts` |
| GoogleDriveTrigger | `packages/nodes-base/nodes/Google/Drive/GoogleDriveTrigger.node.ts` |
| GoogleFirebaseCloudFirestore | `packages/nodes-base/nodes/Google/Firebase/CloudFirestore/GoogleFirebaseCloudFirestore.node.ts` |
| GoogleFirebaseRealtimeDatabase | `packages/nodes-base/nodes/Google/Firebase/RealtimeDatabase/GoogleFirebaseRealtimeDatabase.node.ts` |
| GSuiteAdmin | `packages/nodes-base/nodes/Google/GSuiteAdmin/GSuiteAdmin.node.ts` |
| Gmail | `packages/nodes-base/nodes/Google/Gmail/Gmail.node.ts` |
| GmailTrigger | `packages/nodes-base/nodes/Google/Gmail/GmailTrigger.node.ts` |
| GooglePerspective | `packages/nodes-base/nodes/Google/Perspective/GooglePerspective.node.ts` |
| GoogleSheets | `packages/nodes-base/nodes/Google/Sheet/GoogleSheets.node.ts` |
| GoogleSheetsTrigger | `packages/nodes-base/nodes/Google/Sheet/GoogleSheetsTrigger.node.ts` |
| GoogleSlides | `packages/nodes-base/nodes/Google/Slides/GoogleSlides.node.ts` |
| GoogleTasks | `packages/nodes-base/nodes/Google/Task/GoogleTasks.node.ts` |
| GoogleTranslate | `packages/nodes-base/nodes/Google/Translate/GoogleTranslate.node.ts` |
| YouTube | `packages/nodes-base/nodes/Google/YouTube/YouTube.node.ts` |
| Gotify | `packages/nodes-base/nodes/Gotify/Gotify.node.ts` |
| GoToWebinar | `packages/nodes-base/nodes/GoToWebinar/GoToWebinar.node.ts` |
| Grafana | `packages/nodes-base/nodes/Grafana/Grafana.node.ts` |
| GraphQL | `packages/nodes-base/nodes/GraphQL/GraphQL.node.ts` |
| Grist | `packages/nodes-base/nodes/Grist/Grist.node.ts` |
| GumroadTrigger | `packages/nodes-base/nodes/Gumroad/GumroadTrigger.node.ts` |

#### H
| Node | Source Path |
|------|------------|
| HackerNews | `packages/nodes-base/nodes/HackerNews/HackerNews.node.ts` |
| HaloPSA | `packages/nodes-base/nodes/HaloPSA/HaloPSA.node.ts` |
| Harvest | `packages/nodes-base/nodes/Harvest/Harvest.node.ts` |
| HelpScout | `packages/nodes-base/nodes/HelpScout/HelpScout.node.ts` |
| HelpScoutTrigger | `packages/nodes-base/nodes/HelpScout/HelpScoutTrigger.node.ts` |
| HighLevel | `packages/nodes-base/nodes/HighLevel/HighLevel.node.ts` |
| HomeAssistant | `packages/nodes-base/nodes/HomeAssistant/HomeAssistant.node.ts` |
| Html | `packages/nodes-base/nodes/Html/Html.node.ts` |
| HtmlExtract | `packages/nodes-base/nodes/HtmlExtract/HtmlExtract.node.ts` |
| HttpRequest | `packages/nodes-base/nodes/HttpRequest/HttpRequest.node.ts` |
| Hubspot | `packages/nodes-base/nodes/Hubspot/Hubspot.node.ts` |
| HubspotTrigger | `packages/nodes-base/nodes/Hubspot/HubspotTrigger.node.ts` |
| HumanticAi | `packages/nodes-base/nodes/HumanticAI/HumanticAi.node.ts` |
| Hunter | `packages/nodes-base/nodes/Hunter/Hunter.node.ts` |

#### I
| Node | Source Path |
|------|------------|
| ICalendar | `packages/nodes-base/nodes/ICalendar/ICalendar.node.ts` |
| If | `packages/nodes-base/nodes/If/If.node.ts` |
| Intercom | `packages/nodes-base/nodes/Intercom/Intercom.node.ts` |
| Interval | `packages/nodes-base/nodes/Interval/Interval.node.ts` |
| InvoiceNinja | `packages/nodes-base/nodes/InvoiceNinja/InvoiceNinja.node.ts` |
| InvoiceNinjaTrigger | `packages/nodes-base/nodes/InvoiceNinja/InvoiceNinjaTrigger.node.ts` |
| ItemLists | `packages/nodes-base/nodes/ItemLists/ItemLists.node.ts` |
| Iterable | `packages/nodes-base/nodes/Iterable/Iterable.node.ts` |

#### J
| Node | Source Path |
|------|------------|
| Jenkins | `packages/nodes-base/nodes/Jenkins/Jenkins.node.ts` |
| JinaAi | `packages/nodes-base/nodes/JinaAI/JinaAi.node.ts` |
| Jira | `packages/nodes-base/nodes/Jira/Jira.node.ts` |
| JiraTrigger | `packages/nodes-base/nodes/Jira/JiraTrigger.node.ts` |
| JotFormTrigger | `packages/nodes-base/nodes/JotForm/JotFormTrigger.node.ts` |
| Jwt | `packages/nodes-base/nodes/Jwt/Jwt.node.ts` |

#### K
| Node | Source Path |
|------|------------|
| Kafka | `packages/nodes-base/nodes/Kafka/Kafka.node.ts` |
| KafkaTrigger | `packages/nodes-base/nodes/Kafka/KafkaTrigger.node.ts` |
| Keap | `packages/nodes-base/nodes/Keap/Keap.node.ts` |
| KeapTrigger | `packages/nodes-base/nodes/Keap/KeapTrigger.node.ts` |
| KoBoToolbox | `packages/nodes-base/nodes/KoBoToolbox/KoBoToolbox.node.ts` |
| KoBoToolboxTrigger | `packages/nodes-base/nodes/KoBoToolbox/KoBoToolboxTrigger.node.ts` |

#### L
| Node | Source Path |
|------|------------|
| Ldap | `packages/nodes-base/nodes/Ldap/Ldap.node.ts` |
| Lemlist | `packages/nodes-base/nodes/Lemlist/Lemlist.node.ts` |
| LemlistTrigger | `packages/nodes-base/nodes/Lemlist/LemlistTrigger.node.ts` |
| Line | `packages/nodes-base/nodes/Line/Line.node.ts` |
| Linear | `packages/nodes-base/nodes/Linear/Linear.node.ts` |
| LinearTrigger | `packages/nodes-base/nodes/Linear/LinearTrigger.node.ts` |
| LingvaNex | `packages/nodes-base/nodes/LingvaNex/LingvaNex.node.ts` |
| LinkedIn | `packages/nodes-base/nodes/LinkedIn/LinkedIn.node.ts` |
| LocalFileTrigger | `packages/nodes-base/nodes/LocalFileTrigger/LocalFileTrigger.node.ts` |
| LoneScale | `packages/nodes-base/nodes/LoneScale/LoneScale.node.ts` |
| LoneScaleTrigger | `packages/nodes-base/nodes/LoneScale/LoneScaleTrigger.node.ts` |

#### M
| Node | Source Path |
|------|------------|
| MQTT | `packages/nodes-base/nodes/MQTT/Mqtt.node.ts` |
| MqttTrigger | `packages/nodes-base/nodes/MQTT/MqttTrigger.node.ts` |
| Magento2 | `packages/nodes-base/nodes/Magento/Magento2.node.ts` |
| Mailcheck | `packages/nodes-base/nodes/Mailcheck/Mailcheck.node.ts` |
| Mailchimp | `packages/nodes-base/nodes/Mailchimp/Mailchimp.node.ts` |
| MailchimpTrigger | `packages/nodes-base/nodes/Mailchimp/MailchimpTrigger.node.ts` |
| MailerLite | `packages/nodes-base/nodes/MailerLite/MailerLite.node.ts` |
| MailerLiteTrigger | `packages/nodes-base/nodes/MailerLite/MailerLiteTrigger.node.ts` |
| Mailgun | `packages/nodes-base/nodes/Mailgun/Mailgun.node.ts` |
| Mailjet | `packages/nodes-base/nodes/Mailjet/Mailjet.node.ts` |
| MailjetTrigger | `packages/nodes-base/nodes/Mailjet/MailjetTrigger.node.ts` |
| Mandrill | `packages/nodes-base/nodes/Mandrill/Mandrill.node.ts` |
| ManualTrigger | `packages/nodes-base/nodes/ManualTrigger/ManualTrigger.node.ts` |
| Markdown | `packages/nodes-base/nodes/Markdown/Markdown.node.ts` |
| Marketstack | `packages/nodes-base/nodes/Marketstack/Marketstack.node.ts` |
| Matrix | `packages/nodes-base/nodes/Matrix/Matrix.node.ts` |
| Mattermost | `packages/nodes-base/nodes/Mattermost/Mattermost.node.ts` |
| Mautic | `packages/nodes-base/nodes/Mautic/Mautic.node.ts` |
| MauticTrigger | `packages/nodes-base/nodes/Mautic/MauticTrigger.node.ts` |
| Medium | `packages/nodes-base/nodes/Medium/Medium.node.ts` |
| Merge | `packages/nodes-base/nodes/Merge/Merge.node.ts` |
| MessageAnAgent | `packages/nodes-base/nodes/MessageAnAgent/MessageAnAgent.node.ts` |
| MessageBird | `packages/nodes-base/nodes/MessageBird/MessageBird.node.ts` |
| Metabase | `packages/nodes-base/nodes/Metabase/Metabase.node.ts` |
| AzureCosmosDb | `packages/nodes-base/nodes/Microsoft/AzureCosmosDb/AzureCosmosDb.node.ts` |
| MicrosoftDynamicsCrm | `packages/nodes-base/nodes/Microsoft/Dynamics/MicrosoftDynamicsCrm.node.ts` |
| MicrosoftEntra | `packages/nodes-base/nodes/Microsoft/Entra/MicrosoftEntra.node.ts` |
| MicrosoftExcel | `packages/nodes-base/nodes/Microsoft/Excel/MicrosoftExcel.node.ts` |
| MicrosoftGraphSecurity | `packages/nodes-base/nodes/Microsoft/GraphSecurity/MicrosoftGraphSecurity.node.ts` |
| MicrosoftOneDrive | `packages/nodes-base/nodes/Microsoft/OneDrive/MicrosoftOneDrive.node.ts` |
| MicrosoftOneDriveTrigger | `packages/nodes-base/nodes/Microsoft/OneDrive/MicrosoftOneDriveTrigger.node.ts` |
| MicrosoftOutlook | `packages/nodes-base/nodes/Microsoft/Outlook/MicrosoftOutlook.node.ts` |
| MicrosoftOutlookTrigger | `packages/nodes-base/nodes/Microsoft/Outlook/MicrosoftOutlookTrigger.node.ts` |
| MicrosoftSharePoint | `packages/nodes-base/nodes/Microsoft/SharePoint/MicrosoftSharePoint.node.ts` |
| MicrosoftSql | `packages/nodes-base/nodes/Microsoft/Sql/MicrosoftSql.node.ts` |
| AzureStorage | `packages/nodes-base/nodes/Microsoft/Storage/AzureStorage.node.ts` |
| MicrosoftTeams | `packages/nodes-base/nodes/Microsoft/Teams/MicrosoftTeams.node.ts` |
| MicrosoftTeamsTrigger | `packages/nodes-base/nodes/Microsoft/Teams/MicrosoftTeamsTrigger.node.ts` |
| MicrosoftToDo | `packages/nodes-base/nodes/Microsoft/ToDo/MicrosoftToDo.node.ts` |
| Mindee | `packages/nodes-base/nodes/Mindee/Mindee.node.ts` |
| Misp | `packages/nodes-base/nodes/Misp/Misp.node.ts` |
| MistralAi | `packages/nodes-base/nodes/MistralAI/MistralAi.node.ts` |
| Mocean | `packages/nodes-base/nodes/Mocean/Mocean.node.ts` |
| MondayCom | `packages/nodes-base/nodes/MondayCom/MondayCom.node.ts` |
| MongoDb | `packages/nodes-base/nodes/MongoDb/MongoDb.node.ts` |
| MonicaCrm | `packages/nodes-base/nodes/MonicaCrm/MonicaCrm.node.ts` |
| MoveBinaryData | `packages/nodes-base/nodes/MoveBinaryData/MoveBinaryData.node.ts` |
| Msg91 | `packages/nodes-base/nodes/Msg91/Msg91.node.ts` |
| MySql | `packages/nodes-base/nodes/MySql/MySql.node.ts` |

#### N
| Node | Source Path |
|------|------------|
| N8n | `packages/nodes-base/nodes/N8n/N8n.node.ts` |
| N8nTrainingCustomerDatastore | `packages/nodes-base/nodes/N8nTrainingCustomerDatastore/N8nTrainingCustomerDatastore.node.ts` |
| N8nTrainingCustomerMessenger | `packages/nodes-base/nodes/N8nTrainingCustomerMessenger/N8nTrainingCustomerMessenger.node.ts` |
| N8nTrigger | `packages/nodes-base/nodes/N8nTrigger/N8nTrigger.node.ts` |
| Nasa | `packages/nodes-base/nodes/Nasa/Nasa.node.ts` |
| Netlify | `packages/nodes-base/nodes/Netlify/Netlify.node.ts` |
| NetlifyTrigger | `packages/nodes-base/nodes/Netlify/NetlifyTrigger.node.ts` |
| NetscalerAdc | `packages/nodes-base/nodes/Netscaler/ADC/NetscalerAdc.node.ts` |
| NextCloud | `packages/nodes-base/nodes/NextCloud/NextCloud.node.ts` |
| NocoDB | `packages/nodes-base/nodes/NocoDB/NocoDB.node.ts` |
| NoOp | `packages/nodes-base/nodes/NoOp/NoOp.node.ts` |
| Notion | `packages/nodes-base/nodes/Notion/Notion.node.ts` |
| NotionTrigger | `packages/nodes-base/nodes/Notion/NotionTrigger.node.ts` |
| Npm | `packages/nodes-base/nodes/Npm/Npm.node.ts` |

#### O
| Node | Source Path |
|------|------------|
| Odoo | `packages/nodes-base/nodes/Odoo/Odoo.node.ts` |
| Okta | `packages/nodes-base/nodes/Okta/Okta.node.ts` |
| OneSimpleApi | `packages/nodes-base/nodes/OneSimpleApi/OneSimpleApi.node.ts` |
| Onfleet | `packages/nodes-base/nodes/Onfleet/Onfleet.node.ts` |
| OnfleetTrigger | `packages/nodes-base/nodes/Onfleet/OnfleetTrigger.node.ts` |
| OpenAi | `packages/nodes-base/nodes/OpenAi/OpenAi.node.ts` |
| OpenThesaurus | `packages/nodes-base/nodes/OpenThesaurus/OpenThesaurus.node.ts` |
| OpenWeatherMap | `packages/nodes-base/nodes/OpenWeatherMap/OpenWeatherMap.node.ts` |
| OracleSql | `packages/nodes-base/nodes/Oracle/Sql/OracleSql.node.ts` |
| Orbit | `packages/nodes-base/nodes/Orbit/Orbit.node.ts` |
| Oura | `packages/nodes-base/nodes/Oura/Oura.node.ts` |

#### P
| Node | Source Path |
|------|------------|
| Paddle | `packages/nodes-base/nodes/Paddle/Paddle.node.ts` |
| PagerDuty | `packages/nodes-base/nodes/PagerDuty/PagerDuty.node.ts` |
| PayPal | `packages/nodes-base/nodes/PayPal/PayPal.node.ts` |
| PayPalTrigger | `packages/nodes-base/nodes/PayPal/PayPalTrigger.node.ts` |
| Peekalink | `packages/nodes-base/nodes/Peekalink/Peekalink.node.ts` |
| Perplexity | `packages/nodes-base/nodes/Perplexity/Perplexity.node.ts` |
| Phantombuster | `packages/nodes-base/nodes/Phantombuster/Phantombuster.node.ts` |
| PhilipsHue | `packages/nodes-base/nodes/PhilipsHue/PhilipsHue.node.ts` |
| Pipedrive | `packages/nodes-base/nodes/Pipedrive/Pipedrive.node.ts` |
| PipedriveTrigger | `packages/nodes-base/nodes/Pipedrive/PipedriveTrigger.node.ts` |
| Plivo | `packages/nodes-base/nodes/Plivo/Plivo.node.ts` |
| PostBin | `packages/nodes-base/nodes/PostBin/PostBin.node.ts` |
| PostHog | `packages/nodes-base/nodes/PostHog/PostHog.node.ts` |
| Postgres | `packages/nodes-base/nodes/Postgres/Postgres.node.ts` |
| PostgresTrigger | `packages/nodes-base/nodes/Postgres/PostgresTrigger.node.ts` |
| PostmarkTrigger | `packages/nodes-base/nodes/Postmark/PostmarkTrigger.node.ts` |
| ProfitWell | `packages/nodes-base/nodes/ProfitWell/ProfitWell.node.ts` |
| Pushbullet | `packages/nodes-base/nodes/Pushbullet/Pushbullet.node.ts` |
| Pushcut | `packages/nodes-base/nodes/Pushcut/Pushcut.node.ts` |
| PushcutTrigger | `packages/nodes-base/nodes/Pushcut/PushcutTrigger.node.ts` |
| Pushover | `packages/nodes-base/nodes/Pushover/Pushover.node.ts` |

#### Q
| Node | Source Path |
|------|------------|
| QuestDb | `packages/nodes-base/nodes/QuestDb/QuestDb.node.ts` |
| QuickBase | `packages/nodes-base/nodes/QuickBase/QuickBase.node.ts` |
| QuickBooks | `packages/nodes-base/nodes/QuickBooks/QuickBooks.node.ts` |
| QuickChart | `packages/nodes-base/nodes/QuickChart/QuickChart.node.ts` |

#### R
| Node | Source Path |
|------|------------|
| RabbitMQ | `packages/nodes-base/nodes/RabbitMQ/RabbitMQ.node.ts` |
| RabbitMQTrigger | `packages/nodes-base/nodes/RabbitMQ/RabbitMQTrigger.node.ts` |
| Raindrop | `packages/nodes-base/nodes/Raindrop/Raindrop.node.ts` |
| ReadBinaryFile | `packages/nodes-base/nodes/ReadBinaryFile/ReadBinaryFile.node.ts` |
| ReadBinaryFiles | `packages/nodes-base/nodes/ReadBinaryFiles/ReadBinaryFiles.node.ts` |
| ReadPDF | `packages/nodes-base/nodes/ReadPdf/ReadPDF.node.ts` |
| Reddit | `packages/nodes-base/nodes/Reddit/Reddit.node.ts` |
| Redis | `packages/nodes-base/nodes/Redis/Redis.node.ts` |
| RedisTrigger | `packages/nodes-base/nodes/Redis/RedisTrigger.node.ts` |
| RenameKeys | `packages/nodes-base/nodes/RenameKeys/RenameKeys.node.ts` |
| RespondToWebhook | `packages/nodes-base/nodes/RespondToWebhook/RespondToWebhook.node.ts` |
| Rocketchat | `packages/nodes-base/nodes/Rocketchat/Rocketchat.node.ts` |
| RssFeedRead | `packages/nodes-base/nodes/RssFeedRead/RssFeedRead.node.ts` |
| RssFeedReadTrigger | `packages/nodes-base/nodes/RssFeedRead/RssFeedReadTrigger.node.ts` |
| Rundeck | `packages/nodes-base/nodes/Rundeck/Rundeck.node.ts` |

#### S
| Node | Source Path |
|------|------------|
| S3 | `packages/nodes-base/nodes/S3/S3.node.ts` |
| Salesforce | `packages/nodes-base/nodes/Salesforce/Salesforce.node.ts` |
| SalesforceTrigger | `packages/nodes-base/nodes/Salesforce/SalesforceTrigger.node.ts` |
| Salesmate | `packages/nodes-base/nodes/Salesmate/Salesmate.node.ts` |
| ScheduleTrigger | `packages/nodes-base/nodes/Schedule/ScheduleTrigger.node.ts` |
| SeaTable | `packages/nodes-base/nodes/SeaTable/SeaTable.node.ts` |
| SeaTableTrigger | `packages/nodes-base/nodes/SeaTable/SeaTableTrigger.node.ts` |
| SecurityScorecard | `packages/nodes-base/nodes/SecurityScorecard/SecurityScorecard.node.ts` |
| Segment | `packages/nodes-base/nodes/Segment/Segment.node.ts` |
| SendGrid | `packages/nodes-base/nodes/SendGrid/SendGrid.node.ts` |
| Sendy | `packages/nodes-base/nodes/Sendy/Sendy.node.ts` |
| SentryIo | `packages/nodes-base/nodes/SentryIo/SentryIo.node.ts` |
| ServiceNow | `packages/nodes-base/nodes/ServiceNow/ServiceNow.node.ts` |
| Set | `packages/nodes-base/nodes/Set/Set.node.ts` |
| Shopify | `packages/nodes-base/nodes/Shopify/Shopify.node.ts` |
| ShopifyTrigger | `packages/nodes-base/nodes/Shopify/ShopifyTrigger.node.ts` |
| Signl4 | `packages/nodes-base/nodes/Signl4/Signl4.node.ts` |
| Simulate | `packages/nodes-base/nodes/Simulate/Simulate.node.ts` |
| SimulateTrigger | `packages/nodes-base/nodes/Simulate/SimulateTrigger.node.ts` |
| Slack | `packages/nodes-base/nodes/Slack/Slack.node.ts` |
| SlackTrigger | `packages/nodes-base/nodes/Slack/SlackTrigger.node.ts` |
| Sms77 | `packages/nodes-base/nodes/Sms77/Sms77.node.ts` |
| Snowflake | `packages/nodes-base/nodes/Snowflake/Snowflake.node.ts` |
| SplitInBatches | `packages/nodes-base/nodes/SplitInBatches/SplitInBatches.node.ts` |
| Splunk | `packages/nodes-base/nodes/Splunk/Splunk.node.ts` |
| Spotify | `packages/nodes-base/nodes/Spotify/Spotify.node.ts` |
| SpreadsheetFile | `packages/nodes-base/nodes/SpreadsheetFile/SpreadsheetFile.node.ts` |
| SseTrigger | `packages/nodes-base/nodes/SseTrigger/SseTrigger.node.ts` |
| Ssh | `packages/nodes-base/nodes/Ssh/Ssh.node.ts` |
| Stackby | `packages/nodes-base/nodes/Stackby/Stackby.node.ts` |
| StickyNote | `packages/nodes-base/nodes/StickyNote/StickyNote.node.ts` |
| StopAndError | `packages/nodes-base/nodes/StopAndError/StopAndError.node.ts` |
| Storyblok | `packages/nodes-base/nodes/Storyblok/Storyblok.node.ts` |
| Strapi | `packages/nodes-base/nodes/Strapi/Strapi.node.ts` |
| Strava | `packages/nodes-base/nodes/Strava/Strava.node.ts` |
| StravaTrigger | `packages/nodes-base/nodes/Strava/StravaTrigger.node.ts` |
| Stripe | `packages/nodes-base/nodes/Stripe/Stripe.node.ts` |
| StripeTrigger | `packages/nodes-base/nodes/Stripe/StripeTrigger.node.ts` |
| Supabase | `packages/nodes-base/nodes/Supabase/Supabase.node.ts` |
| SurveyMonkeyTrigger | `packages/nodes-base/nodes/SurveyMonkey/SurveyMonkeyTrigger.node.ts` |
| Switch | `packages/nodes-base/nodes/Switch/Switch.node.ts` |
| SyncroMsp | `packages/nodes-base/nodes/SyncroMSP/SyncroMsp.node.ts` |

#### T
| Node | Source Path |
|------|------------|
| Taiga | `packages/nodes-base/nodes/Taiga/Taiga.node.ts` |
| TaigaTrigger | `packages/nodes-base/nodes/Taiga/TaigaTrigger.node.ts` |
| Tapfiliate | `packages/nodes-base/nodes/Tapfiliate/Tapfiliate.node.ts` |
| Telegram | `packages/nodes-base/nodes/Telegram/Telegram.node.ts` |
| TelegramTrigger | `packages/nodes-base/nodes/Telegram/TelegramTrigger.node.ts` |
| TheHive | `packages/nodes-base/nodes/TheHive/TheHive.node.ts` |
| TheHiveTrigger | `packages/nodes-base/nodes/TheHive/TheHiveTrigger.node.ts` |
| TheHiveProject | `packages/nodes-base/nodes/TheHiveProject/TheHiveProject.node.ts` |
| TheHiveProjectTrigger | `packages/nodes-base/nodes/TheHiveProject/TheHiveProjectTrigger.node.ts` |
| TimeSaved | `packages/nodes-base/nodes/TimeSaved/TimeSaved.node.ts` |
| TimescaleDb | `packages/nodes-base/nodes/TimescaleDb/TimescaleDb.node.ts` |
| Todoist | `packages/nodes-base/nodes/Todoist/Todoist.node.ts` |
| TogglTrigger | `packages/nodes-base/nodes/Toggl/TogglTrigger.node.ts` |
| Totp | `packages/nodes-base/nodes/Totp/Totp.node.ts` |
| Aggregate | `packages/nodes-base/nodes/Transform/Aggregate/Aggregate.node.ts` |
| Limit | `packages/nodes-base/nodes/Transform/Limit/Limit.node.ts` |
| RemoveDuplicates | `packages/nodes-base/nodes/Transform/RemoveDuplicates/RemoveDuplicates.node.ts` |
| Sort | `packages/nodes-base/nodes/Transform/Sort/Sort.node.ts` |
| SplitOut | `packages/nodes-base/nodes/Transform/SplitOut/SplitOut.node.ts` |
| Summarize | `packages/nodes-base/nodes/Transform/Summarize/Summarize.node.ts` |
| TravisCi | `packages/nodes-base/nodes/TravisCi/TravisCi.node.ts` |
| Trello | `packages/nodes-base/nodes/Trello/Trello.node.ts` |
| TrelloTrigger | `packages/nodes-base/nodes/Trello/TrelloTrigger.node.ts` |
| Twake | `packages/nodes-base/nodes/Twake/Twake.node.ts` |
| Twilio | `packages/nodes-base/nodes/Twilio/Twilio.node.ts` |
| TwilioTrigger | `packages/nodes-base/nodes/Twilio/TwilioTrigger.node.ts` |
| Twist | `packages/nodes-base/nodes/Twist/Twist.node.ts` |
| Twitter | `packages/nodes-base/nodes/Twitter/Twitter.node.ts` |
| TypeformTrigger | `packages/nodes-base/nodes/Typeform/TypeformTrigger.node.ts` |

#### U-Z
| Node | Source Path |
|------|------------|
| UProc | `packages/nodes-base/nodes/UProc/UProc.node.ts` |
| UnleashedSoftware | `packages/nodes-base/nodes/UnleashedSoftware/UnleashedSoftware.node.ts` |
| Uplead | `packages/nodes-base/nodes/Uplead/Uplead.node.ts` |
| UptimeRobot | `packages/nodes-base/nodes/UptimeRobot/UptimeRobot.node.ts` |
| UrlScanIo | `packages/nodes-base/nodes/UrlScanIo/UrlScanIo.node.ts` |
| VenafiTlsProtectDatacenter | `packages/nodes-base/nodes/Venafi/Datacenter/VenafiTlsProtectDatacenter.node.ts` |
| VenafiTlsProtectDatacenterTrigger | `packages/nodes-base/nodes/Venafi/Datacenter/VenafiTlsProtectDatacenterTrigger.node.ts` |
| VenafiTlsProtectCloud | `packages/nodes-base/nodes/Venafi/ProtectCloud/VenafiTlsProtectCloud.node.ts` |
| VenafiTlsProtectCloudTrigger | `packages/nodes-base/nodes/Venafi/ProtectCloud/VenafiTlsProtectCloudTrigger.node.ts` |
| Vero | `packages/nodes-base/nodes/Vero/Vero.node.ts` |
| Vonage | `packages/nodes-base/nodes/Vonage/Vonage.node.ts` |
| Wait | `packages/nodes-base/nodes/Wait/Wait.node.ts` |
| Webflow | `packages/nodes-base/nodes/Webflow/Webflow.node.ts` |
| WebflowTrigger | `packages/nodes-base/nodes/Webflow/WebflowTrigger.node.ts` |
| Webhook | `packages/nodes-base/nodes/Webhook/Webhook.node.ts` |
| Wekan | `packages/nodes-base/nodes/Wekan/Wekan.node.ts` |
| WhatsApp | `packages/nodes-base/nodes/WhatsApp/WhatsApp.node.ts` |
| WhatsAppTrigger | `packages/nodes-base/nodes/WhatsApp/WhatsAppTrigger.node.ts` |
| Wise | `packages/nodes-base/nodes/Wise/Wise.node.ts` |
| WiseTrigger | `packages/nodes-base/nodes/Wise/WiseTrigger.node.ts` |
| WooCommerce | `packages/nodes-base/nodes/WooCommerce/WooCommerce.node.ts` |
| WooCommerceTrigger | `packages/nodes-base/nodes/WooCommerce/WooCommerceTrigger.node.ts` |
| Wordpress | `packages/nodes-base/nodes/Wordpress/Wordpress.node.ts` |
| WorkableTrigger | `packages/nodes-base/nodes/Workable/WorkableTrigger.node.ts` |
| WorkflowTrigger | `packages/nodes-base/nodes/WorkflowTrigger/WorkflowTrigger.node.ts` |
| WriteBinaryFile | `packages/nodes-base/nodes/WriteBinaryFile/WriteBinaryFile.node.ts` |
| WufooTrigger | `packages/nodes-base/nodes/Wufoo/WufooTrigger.node.ts` |
| Xero | `packages/nodes-base/nodes/Xero/Xero.node.ts` |
| Xml | `packages/nodes-base/nodes/Xml/Xml.node.ts` |
| Yourls | `packages/nodes-base/nodes/Yourls/Yourls.node.ts` |
| Zammad | `packages/nodes-base/nodes/Zammad/Zammad.node.ts` |
| Zendesk | `packages/nodes-base/nodes/Zendesk/Zendesk.node.ts` |
| ZendeskTrigger | `packages/nodes-base/nodes/Zendesk/ZendeskTrigger.node.ts` |
| ZohoCrm | `packages/nodes-base/nodes/Zoho/ZohoCrm.node.ts` |
| Zoom | `packages/nodes-base/nodes/Zoom/Zoom.node.ts` |
| Zulip | `packages/nodes-base/nodes/Zulip/Zulip.node.ts` |

---

### @n8n/n8n-nodes-langchain (122 registered nodes)

Source path: `packages/@n8n/nodes-langchain/nodes/<Category>/<NodeName>/<NodeFile>.node.ts`

#### Agents
| Node | Source Path |
|------|------------|
| Agent | `packages/@n8n/nodes-langchain/nodes/agents/Agent/Agent.node.ts` |
| AgentTool | `packages/@n8n/nodes-langchain/nodes/agents/Agent/AgentTool.node.ts` |
| OpenAiAssistant | `packages/@n8n/nodes-langchain/nodes/agents/OpenAiAssistant/OpenAiAssistant.node.ts` |

#### Chains
| Node | Source Path |
|------|------------|
| ChainLlm | `packages/@n8n/nodes-langchain/nodes/chains/ChainLLM/ChainLlm.node.ts` |
| ChainRetrievalQa | `packages/@n8n/nodes-langchain/nodes/chains/ChainRetrievalQA/ChainRetrievalQa.node.ts` |
| ChainSummarization | `packages/@n8n/nodes-langchain/nodes/chains/ChainSummarization/ChainSummarization.node.ts` |
| InformationExtractor | `packages/@n8n/nodes-langchain/nodes/chains/InformationExtractor/InformationExtractor.node.ts` |
| SentimentAnalysis | `packages/@n8n/nodes-langchain/nodes/chains/SentimentAnalysis/SentimentAnalysis.node.ts` |
| TextClassifier | `packages/@n8n/nodes-langchain/nodes/chains/TextClassifier/TextClassifier.node.ts` |

#### Code
| Node | Source Path |
|------|------------|
| Code | `packages/@n8n/nodes-langchain/nodes/code/Code.node.ts` |

#### Document Loaders
| Node | Source Path |
|------|------------|
| DocumentBinaryInputLoader | `packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentBinaryInputLoader/DocumentBinaryInputLoader.node.ts` |
| DocumentDefaultDataLoader | `packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentDefaultDataLoader/DocumentDefaultDataLoader.node.ts` |
| DocumentGithubLoader | `packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentGithubLoader/DocumentGithubLoader.node.ts` |
| DocumentJsonInputLoader | `packages/@n8n/nodes-langchain/nodes/document_loaders/DocumentJSONInputLoader/DocumentJsonInputLoader.node.ts` |

#### Embeddings
| Node | Source Path |
|------|------------|
| EmbeddingsAwsBedrock | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsAwsBedrock/EmbeddingsAwsBedrock.node.ts` |
| EmbeddingsAzureOpenAi | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsAzureOpenAi/EmbeddingsAzureOpenAi.node.ts` |
| EmbeddingsCohere | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsCohere/EmbeddingsCohere.node.ts` |
| EmbeddingsGoogleGemini | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsGoogleGemini/EmbeddingsGoogleGemini.node.ts` |
| EmbeddingsGoogleVertex | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsGoogleVertex/EmbeddingsGoogleVertex.node.ts` |
| EmbeddingsHuggingFaceInference | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsHuggingFaceInference/EmbeddingsHuggingFaceInference.node.ts` |
| EmbeddingsLemonade | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsLemonade/EmbeddingsLemonade.node.ts` |
| EmbeddingsMistralCloud | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsMistralCloud/EmbeddingsMistralCloud.node.ts` |
| EmbeddingsNvidia | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsNvidia/EmbeddingsNvidia.node.ts` |
| EmbeddingsOllama | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsOllama/EmbeddingsOllama.node.ts` |
| EmbeddingsOpenAi | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsOpenAI/EmbeddingsOpenAi.node.ts` |
| EmbeddingsOracleDb | `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsOracleDB/EmbeddingsOracleDb.node.ts` |

#### Guardrails
| Node | Source Path |
|------|------------|
| Guardrails | `packages/@n8n/nodes-langchain/nodes/Guardrails/Guardrails.node.ts` |

#### LLMs
| Node | Source Path |
|------|------------|
| LmChatAlibabaCloud | `packages/@n8n/nodes-langchain/nodes/llms/LmChatAlibabaCloud/LmChatAlibabaCloud.node.ts` |
| LmChatAnthropic | `packages/@n8n/nodes-langchain/nodes/llms/LMChatAnthropic/LmChatAnthropic.node.ts` |
| LmChatAwsBedrock | `packages/@n8n/nodes-langchain/nodes/llms/LmChatAwsBedrock/LmChatAwsBedrock.node.ts` |
| LmChatAzureOpenAi | `packages/@n8n/nodes-langchain/nodes/llms/LmChatAzureOpenAi/LmChatAzureOpenAi.node.ts` |
| LmChatCohere | `packages/@n8n/nodes-langchain/nodes/llms/LmChatCohere/LmChatCohere.node.ts` |
| LmChatDeepSeek | `packages/@n8n/nodes-langchain/nodes/llms/LmChatDeepSeek/LmChatDeepSeek.node.ts` |
| LmChatGoogleGemini | `packages/@n8n/nodes-langchain/nodes/llms/LmChatGoogleGemini/LmChatGoogleGemini.node.ts` |
| LmChatGoogleVertex | `packages/@n8n/nodes-langchain/nodes/llms/LmChatGoogleVertex/LmChatGoogleVertex.node.ts` |
| LmChatGroq | `packages/@n8n/nodes-langchain/nodes/llms/LmChatGroq/LmChatGroq.node.ts` |
| LmChatLemonade | `packages/@n8n/nodes-langchain/nodes/llms/LMChatLemonade/LmChatLemonade.node.ts` |
| LmChatMinimax | `packages/@n8n/nodes-langchain/nodes/llms/LmChatMinimax/LmChatMinimax.node.ts` |
| LmChatMistralCloud | `packages/@n8n/nodes-langchain/nodes/llms/LmChatMistralCloud/LmChatMistralCloud.node.ts` |
| LmChatMoonshot | `packages/@n8n/nodes-langchain/nodes/llms/LmChatMoonshot/LmChatMoonshot.node.ts` |
| LmChatNvidia | `packages/@n8n/nodes-langchain/nodes/llms/LmChatNvidia/LmChatNvidia.node.ts` |
| LmChatOllama | `packages/@n8n/nodes-langchain/nodes/llms/LMChatOllama/LmChatOllama.node.ts` |
| LmChatOpenAi | `packages/@n8n/nodes-langchain/nodes/llms/LMChatOpenAi/LmChatOpenAi.node.ts` |
| LmChatOpenRouter | `packages/@n8n/nodes-langchain/nodes/llms/LmChatOpenRouter/LmChatOpenRouter.node.ts` |
| LmChatVercelAiGateway | `packages/@n8n/nodes-langchain/nodes/llms/LmChatVercelAiGateway/LmChatVercelAiGateway.node.ts` |
| LmChatXAiGrok | `packages/@n8n/nodes-langchain/nodes/llms/LmChatXAiGrok/LmChatXAiGrok.node.ts` |
| LmCohere | `packages/@n8n/nodes-langchain/nodes/llms/LMCohere/LmCohere.node.ts` |
| LmLemonade | `packages/@n8n/nodes-langchain/nodes/llms/LMLemonade/LmLemonade.node.ts` |
| LmOllama | `packages/@n8n/nodes-langchain/nodes/llms/LMOllama/LmOllama.node.ts` |
| LmOpenAi | `packages/@n8n/nodes-langchain/nodes/llms/LMOpenAi/LmOpenAi.node.ts` |
| LmOpenHuggingFaceInference | `packages/@n8n/nodes-langchain/nodes/llms/LMOpenHuggingFaceInference/LmOpenHuggingFaceInference.node.ts` |

#### MCP
| Node | Source Path |
|------|------------|
| McpClient | `packages/@n8n/nodes-langchain/nodes/mcp/McpClient/McpClient.node.ts` |
| McpClientTool | `packages/@n8n/nodes-langchain/nodes/mcp/McpClientTool/McpClientTool.node.ts` |
| McpRegistryClientTool | `packages/@n8n/nodes-langchain/nodes/mcp/McpRegistryClientTool/McpRegistryClientTool.node.ts` |
| McpTrigger | `packages/@n8n/nodes-langchain/nodes/mcp/McpTrigger/McpTrigger.node.ts` |

#### Memory
| Node | Source Path |
|------|------------|
| MemoryBufferWindow | `packages/@n8n/nodes-langchain/nodes/memory/MemoryBufferWindow/MemoryBufferWindow.node.ts` |
| MemoryChatRetriever | `packages/@n8n/nodes-langchain/nodes/memory/MemoryChatRetriever/MemoryChatRetriever.node.ts` |
| MemoryManager | `packages/@n8n/nodes-langchain/nodes/memory/MemoryManager/MemoryManager.node.ts` |
| MemoryMongoDbChat | `packages/@n8n/nodes-langchain/nodes/memory/MemoryMongoDbChat/MemoryMongoDbChat.node.ts` |
| MemoryMotorhead | `packages/@n8n/nodes-langchain/nodes/memory/MemoryMotorhead/MemoryMotorhead.node.ts` |
| MemoryPostgresChat | `packages/@n8n/nodes-langchain/nodes/memory/MemoryPostgresChat/MemoryPostgresChat.node.ts` |
| MemoryRedisChat | `packages/@n8n/nodes-langchain/nodes/memory/MemoryRedisChat/MemoryRedisChat.node.ts` |
| MemoryXata | `packages/@n8n/nodes-langchain/nodes/memory/MemoryXata/MemoryXata.node.ts` |
| MemoryZep | `packages/@n8n/nodes-langchain/nodes/memory/MemoryZep/MemoryZep.node.ts` |

#### Model Selector
| Node | Source Path |
|------|------------|
| ModelSelector | `packages/@n8n/nodes-langchain/nodes/ModelSelector/ModelSelector.node.ts` |

#### Output Parsers
| Node | Source Path |
|------|------------|
| OutputParserAutofixing | `packages/@n8n/nodes-langchain/nodes/output_parser/OutputParserAutofixing/OutputParserAutofixing.node.ts` |
| OutputParserItemList | `packages/@n8n/nodes-langchain/nodes/output_parser/OutputParserItemList/OutputParserItemList.node.ts` |
| OutputParserStructured | `packages/@n8n/nodes-langchain/nodes/output_parser/OutputParserStructured/OutputParserStructured.node.ts` |

#### Rerankers
| Node | Source Path |
|------|------------|
| RerankerCohere | `packages/@n8n/nodes-langchain/nodes/rerankers/RerankerCohere/RerankerCohere.node.ts` |

#### Retrievers
| Node | Source Path |
|------|------------|
| RetrieverContextualCompression | `packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverContextualCompression/RetrieverContextualCompression.node.ts` |
| RetrieverMultiQuery | `packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverMultiQuery/RetrieverMultiQuery.node.ts` |
| RetrieverVectorStore | `packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverVectorStore/RetrieverVectorStore.node.ts` |
| RetrieverWorkflow | `packages/@n8n/nodes-langchain/nodes/retrievers/RetrieverWorkflow/RetrieverWorkflow.node.ts` |

#### Text Splitters
| Node | Source Path |
|------|------------|
| TextSplitterCharacterTextSplitter | `packages/@n8n/nodes-langchain/nodes/text_splitters/TextSplitterCharacterTextSplitter/TextSplitterCharacterTextSplitter.node.ts` |
| TextSplitterRecursiveCharacterTextSplitter | `packages/@n8n/nodes-langchain/nodes/text_splitters/TextSplitterRecursiveCharacterTextSplitter/TextSplitterRecursiveCharacterTextSplitter.node.ts` |
| TextSplitterTokenSplitter | `packages/@n8n/nodes-langchain/nodes/text_splitters/TextSplitterTokenSplitter/TextSplitterTokenSplitter.node.ts` |

#### Tool Executor
| Node | Source Path |
|------|------------|
| ToolExecutor | `packages/@n8n/nodes-langchain/nodes/ToolExecutor/ToolExecutor.node.ts` |

#### Tools
| Node | Source Path |
|------|------------|
| ToolCalculator | `packages/@n8n/nodes-langchain/nodes/tools/ToolCalculator/ToolCalculator.node.ts` |
| ToolCode | `packages/@n8n/nodes-langchain/nodes/tools/ToolCode/ToolCode.node.ts` |
| ToolHttpRequest | `packages/@n8n/nodes-langchain/nodes/tools/ToolHttpRequest/ToolHttpRequest.node.ts` |
| ToolSearXng | `packages/@n8n/nodes-langchain/nodes/tools/ToolSearXng/ToolSearXng.node.ts` |
| ToolSerpApi | `packages/@n8n/nodes-langchain/nodes/tools/ToolSerpApi/ToolSerpApi.node.ts` |
| ToolThink | `packages/@n8n/nodes-langchain/nodes/tools/ToolThink/ToolThink.node.ts` |
| ToolVectorStore | `packages/@n8n/nodes-langchain/nodes/tools/ToolVectorStore/ToolVectorStore.node.ts` |
| ToolWikipedia | `packages/@n8n/nodes-langchain/nodes/tools/ToolWikipedia/ToolWikipedia.node.ts` |
| ToolWolframAlpha | `packages/@n8n/nodes-langchain/nodes/tools/ToolWolframAlpha/ToolWolframAlpha.node.ts` |
| ToolWorkflow | `packages/@n8n/nodes-langchain/nodes/tools/ToolWorkflow/ToolWorkflow.node.ts` |

#### Triggers
| Node | Source Path |
|------|------------|
| ChatTrigger | `packages/@n8n/nodes-langchain/nodes/trigger/ChatTrigger/ChatTrigger.node.ts` |
| Chat | `packages/@n8n/nodes-langchain/nodes/trigger/ChatTrigger/Chat.node.ts` |
| ManualChatTrigger | `packages/@n8n/nodes-langchain/nodes/trigger/ManualChatTrigger/ManualChatTrigger.node.ts` |

#### Vector Stores
| Node | Source Path |
|------|------------|
| ChatHubVectorStorePGVector | `packages/@n8n/nodes-langchain/nodes/vector_store/ChatHubVectorStorePGVector/ChatHubVectorStorePGVector.node.ts` |
| ChatHubVectorStorePinecone | `packages/@n8n/nodes-langchain/nodes/vector_store/ChatHubVectorStorePinecone/ChatHubVectorStorePinecone.node.ts` |
| ChatHubVectorStoreQdrant | `packages/@n8n/nodes-langchain/nodes/vector_store/ChatHubVectorStoreQdrant/ChatHubVectorStoreQdrant.node.ts` |
| VectorStoreAzureAISearch | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreAzureAISearch/VectorStoreAzureAISearch.node.ts` |
| VectorStoreChromaDB | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreChromaDB/VectorStoreChromaDB.node.ts` |
| VectorStoreInMemory | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreInMemory/VectorStoreInMemory.node.ts` |
| VectorStoreInMemoryInsert | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreInMemoryInsert/VectorStoreInMemoryInsert.node.ts` |
| VectorStoreInMemoryLoad | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreInMemoryLoad/VectorStoreInMemoryLoad.node.ts` |
| VectorStoreMilvus | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreMilvus/VectorStoreMilvus.node.ts` |
| VectorStoreMongoDBAtlas | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreMongoDBAtlas/VectorStoreMongoDBAtlas.node.ts` |
| VectorStoreOracleDB | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreOracleDB/VectorStoreOracleDB.node.ts` |
| VectorStorePGVector | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStorePGVector/VectorStorePGVector.node.ts` |
| VectorStorePinecone | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStorePinecone/VectorStorePinecone.node.ts` |
| VectorStorePineconeInsert | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStorePineconeInsert/VectorStorePineconeInsert.node.ts` |
| VectorStorePineconeLoad | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStorePineconeLoad/VectorStorePineconeLoad.node.ts` |
| VectorStoreQdrant | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreQdrant/VectorStoreQdrant.node.ts` |
| VectorStoreRedis | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreRedis/VectorStoreRedis.node.ts` |
| VectorStoreSupabase | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreSupabase/VectorStoreSupabase.node.ts` |
| VectorStoreSupabaseInsert | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreSupabaseInsert/VectorStoreSupabaseInsert.node.ts` |
| VectorStoreSupabaseLoad | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreSupabaseLoad/VectorStoreSupabaseLoad.node.ts` |
| VectorStoreWeaviate | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreWeaviate/VectorStoreWeaviate.node.ts` |
| VectorStoreZep | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreZep/VectorStoreZep.node.ts` |
| VectorStoreZepInsert | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreZepInsert/VectorStoreZepInsert.node.ts` |
| VectorStoreZepLoad | `packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreZepLoad/VectorStoreZepLoad.node.ts` |

#### Vendors
| Node | Source Path |
|------|------------|
| AlibabaCloud | `packages/@n8n/nodes-langchain/nodes/vendors/AlibabaCloud/AlibabaCloud.node.ts` |
| Anthropic | `packages/@n8n/nodes-langchain/nodes/vendors/Anthropic/Anthropic.node.ts` |
| GoogleGemini | `packages/@n8n/nodes-langchain/nodes/vendors/GoogleGemini/GoogleGemini.node.ts` |
| MicrosoftAgent365Trigger | `packages/@n8n/nodes-langchain/nodes/vendors/Microsoft/MicrosoftAgent365Trigger.node.ts` |
| MiniMax | `packages/@n8n/nodes-langchain/nodes/vendors/MiniMax/MiniMax.node.ts` |
| Moonshot | `packages/@n8n/nodes-langchain/nodes/vendors/Moonshot/Moonshot.node.ts` |
| Ollama | `packages/@n8n/nodes-langchain/nodes/vendors/Ollama/Ollama.node.ts` |
| OpenAi | `packages/@n8n/nodes-langchain/nodes/vendors/OpenAi/OpenAi.node.ts` |

---

## Unique Node Count

| Count Type | n8n-nodes-base | @n8n/n8n-nodes-langchain | Total |
|-----------|:--------------:|:------------------------:|:-----:|
| **Registered node classes** | 439 | 122 | **561** |
| **Source `.node.ts` files** | 540 | 135 | **675** |
| **Integration directories** | 307 | 117 | **424** |

- **Registered node classes (561):** The nodes listed in each package's `package.json` under `n8n.nodes` — these are the actual node types n8n loads at runtime.
- **Source `.node.ts` files (675):** All source implementation files, including version variants (v1, v2, v3) that are bundled under a `VersionedNodeType` wrapper.
- **Integration directories (424):** Top-level directories representing distinct integrations/services.

Note: 2 of the 439 nodes-base registered nodes are Enterprise Edition only (`Evaluation` and `EvaluationTrigger`, suffixed `.ee.js`).
