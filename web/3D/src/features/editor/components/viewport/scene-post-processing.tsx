"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { SceneSettings } from "../../types";

type NumericUniforms = Record<string, { value: number }>;

function setBokehUniform(pass: BokehPass, key: string, value: number) {
  const uniforms = pass.uniforms as NumericUniforms;

  if (uniforms[key]) {
    uniforms[key].value = value;
  }
}

export function ScenePostProcessing({ settings }: { settings: SceneSettings }) {
  const { camera, gl, scene, size } = useThree();
  const enabled = settings.postProcessingEnabled && (settings.bloomEnabled || settings.depthOfFieldEnabled);
  const pipeline = useMemo(() => {
    if (!enabled) {
      return null;
    }

    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const bokehPass = settings.depthOfFieldEnabled
      ? new BokehPass(scene, camera, {
          aperture: settings.depthOfFieldAperture,
          focus: settings.depthOfFieldFocus,
          maxblur: settings.depthOfFieldMaxBlur,
        })
      : null;
    const bloomPass = settings.bloomEnabled
      ? new UnrealBloomPass(new Vector2(size.width, size.height), settings.bloomIntensity, settings.bloomRadius, settings.bloomThreshold)
      : null;

    composer.addPass(renderPass);

    if (bokehPass) {
      composer.addPass(bokehPass);
    }

    if (bloomPass) {
      composer.addPass(bloomPass);
    }

    composer.addPass(new OutputPass());

    return { bloomPass, bokehPass, composer };
  }, [camera, enabled, gl, scene, settings.bloomEnabled, settings.depthOfFieldEnabled, size.height, size.width]);

  useEffect(() => {
    if (!pipeline) {
      return;
    }

    pipeline.composer.setPixelRatio(gl.getPixelRatio());
    pipeline.composer.setSize(size.width, size.height);
  }, [gl, pipeline, size.height, size.width]);

  useEffect(() => {
    if (!pipeline?.bloomPass) {
      return;
    }

    pipeline.bloomPass.strength = settings.bloomIntensity;
    pipeline.bloomPass.threshold = settings.bloomThreshold;
    pipeline.bloomPass.radius = settings.bloomRadius;
  }, [pipeline, settings.bloomIntensity, settings.bloomRadius, settings.bloomThreshold]);

  useEffect(() => {
    if (!pipeline?.bokehPass) {
      return;
    }

    setBokehUniform(pipeline.bokehPass, "focus", settings.depthOfFieldFocus);
    setBokehUniform(pipeline.bokehPass, "aperture", settings.depthOfFieldAperture);
    setBokehUniform(pipeline.bokehPass, "maxblur", settings.depthOfFieldMaxBlur);
  }, [pipeline, settings.depthOfFieldAperture, settings.depthOfFieldFocus, settings.depthOfFieldMaxBlur]);

  useEffect(() => {
    return () => {
      pipeline?.composer.dispose();
    };
  }, [pipeline]);

  useFrame((_, delta) => {
    pipeline?.composer.render(delta);
  }, enabled ? 1 : 0);

  return null;
}
