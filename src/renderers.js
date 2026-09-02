const TAU = Math.PI * 2;

const POINT_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNormal;
uniform float uMix;
uniform float uPointScale;
uniform float uMorphPulse;
uniform vec3 uLightDirection;
uniform float uWalk;
uniform float uWalkHead;
uniform float uCount;
uniform float uWalkTrail;
uniform float uMaxPointSize;

in vec3 aPosition;
in vec3 aTarget;
in float aCrowding;
in float aTargetCrowding;
in float aSequence;
in float aTargetSequence;

out float vCrowding;
out float vFacing;
out float vIllumination;
out float vWalkGlow;

vec3 sphericalMix(vec3 from, vec3 to, float amount) {
  float cosine = clamp(dot(from, to), -0.9995, 0.9995);
  if (cosine > 0.9975) return normalize(mix(from, to, amount));

  float angle = acos(cosine);
  float denominator = sin(angle);
  return normalize(
    from * (sin((1.0 - amount) * angle) / denominator) +
    to * (sin(amount * angle) / denominator)
  );
}

float sequenceGlow(float sequence) {
  float behind = mod(uWalkHead - sequence + uCount, uCount);
  float glow = 0.0;

  if (behind <= uWalkTrail) {
    float amount = 1.0 - behind / max(uWalkTrail, 0.0001);
    glow = amount * amount;
    if (behind < 1.0) {
      glow = max(glow, 0.55 + 0.45 * (1.0 - behind));
    }
  }

  return glow;
}

void main() {
  vec3 unitPosition = sphericalMix(normalize(aPosition), normalize(aTarget), uMix);
  vec3 localPosition = unitPosition * __SPHERE_RADIUS__;
  vec4 worldPosition = uModel * vec4(localPosition, 1.0);
  vec4 viewPosition = uView * worldPosition;
  vec3 viewNormal = normalize(uNormal * unitPosition);
  vec3 viewDirection = normalize(-viewPosition.xyz);

  vFacing = dot(viewNormal, viewDirection);
  vCrowding = mix(aCrowding, aTargetCrowding, uMix);
  vWalkGlow = mix(
    sequenceGlow(aSequence),
    sequenceGlow(aTargetSequence),
    uMix
  ) * uWalk;
  vIllumination = 0.58 + 0.42 * max(
    dot(viewNormal, normalize(uLightDirection)),
    0.0
  );

  float perspectiveSize = uPointScale / max(1.0, -viewPosition.z);
  float sized = perspectiveSize *
    (1.0 + uMorphPulse * 0.18) *
    (1.0 + vWalkGlow * 2.0);
  gl_PointSize = min(uMaxPointSize, sized);
  gl_Position = uProjection * viewPosition;
}
`;

const POINT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uSpacing;
uniform float uTheme;
uniform float uMorphPulse;
uniform float uWalk;

in float vCrowding;
in float vFacing;
in float vIllumination;
in float vWalkGlow;

out vec4 fragColor;

void main() {
  vec2 centered = gl_PointCoord * 2.0 - 1.0;
  float radius = length(centered);
  if (radius > 1.0) discard;

  float sphereZ = sqrt(max(0.0, 1.0 - radius * radius));
  vec3 beadNormal = normalize(vec3(centered.x, -centered.y, sphereZ));
  float beadLight = 0.60 + 0.40 * max(
    dot(beadNormal, normalize(vec3(-0.38, 0.52, 0.76))),
    0.0
  );
  float core = smoothstep(0.70, 0.05, radius);
  float edge = smoothstep(1.0, 0.40, radius);
  float halo = exp(-4.6 * radius * radius);
  float front = mix(0.08, 1.0, smoothstep(-0.32, 0.12, vFacing));

  vec3 uvBase = vec3(0.78, 0.74, 1.0);
  vec3 uvCrowded = vec3(0.90, 0.50, 0.35);
  vec3 paperBase = vec3(0.15, 0.12, 0.11);
  vec3 paperCrowded = vec3(0.61, 0.19, 0.22);
  vec3 uvAccent = vec3(0.710, 0.608, 1.0);
  vec3 paperAccent = vec3(0.612, 0.188, 0.220);
  vec3 baseColor = mix(paperBase, uvBase, uTheme);
  vec3 crowdedColor = mix(paperCrowded, uvCrowded, uTheme);
  vec3 accent = mix(paperAccent, uvAccent, uTheme);
  vec3 color = mix(baseColor, crowdedColor, vCrowding * uSpacing);
  color = mix(color, accent, vWalkGlow * 0.92);

  float uvEnergy = core * 1.42 + halo * 0.42 + uMorphPulse * 0.22;
  float paperEnergy = 0.70 + core * 0.30;
  float energy = mix(paperEnergy, uvEnergy, uTheme);
  float rest = mix(1.0, 0.36, uWalk);
  float walkMix = mix(rest, 1.18, vWalkGlow);
  float alpha = edge * front * mix(0.90, 1.0, uTheme) *
    mix(rest, 1.0, vWalkGlow);

  fragColor = vec4(
    color * energy * beadLight * vIllumination * walkMix,
    alpha
  );
}
`;

const SHELL_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uNormal;

in vec3 aPosition;
in vec3 aNormal;

out vec3 vNormalView;
out vec3 vViewPosition;

void main() {
  vec4 viewPosition = uView * uModel * vec4(aPosition, 1.0);
  vViewPosition = viewPosition.xyz;
  vNormalView = normalize(uNormal * aNormal);
  gl_Position = uProjection * viewPosition;
}
`;

const SHELL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uTheme;

in vec3 vNormalView;
in vec3 vViewPosition;

out vec4 fragColor;

void main() {
  vec3 viewDirection = normalize(-vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormalView, viewDirection)), 2.6);
  vec3 paper = vec3(0.18, 0.15, 0.13);
  vec3 uv = vec3(0.42, 0.34, 0.78);
  vec3 color = mix(paper, uv, uTheme);
  float alpha = mix(
    0.020 + fresnel * 0.09,
    0.016 + fresnel * 0.17,
    uTheme
  );
  fragColor = vec4(color, alpha);
}
`;

export const matrix4 = {
  identity() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  },

  multiply(left, right) {
    const result = new Float32Array(16);

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        result[column * 4 + row] =
          left[row] * right[column * 4] +
          left[row + 4] * right[column * 4 + 1] +
          left[row + 8] * right[column * 4 + 2] +
          left[row + 12] * right[column * 4 + 3];
      }
    }

    return result;
  },

  perspective(verticalFov, aspect, near, far) {
    const focalLength = 1 / Math.tan(verticalFov / 2);
    const rangeInverse = 1 / (near - far);
    const result = new Float32Array(16);
    result[0] = focalLength / aspect;
    result[5] = focalLength;
    result[10] = (far + near) * rangeInverse;
    result[11] = -1;
    result[14] = 2 * far * near * rangeInverse;
    return result;
  },

  lookAt(eye, target, up) {
    let zx = eye[0] - target[0];
    let zy = eye[1] - target[1];
    let zz = eye[2] - target[2];
    const zLength = Math.hypot(zx, zy, zz) || 1;
    zx /= zLength;
    zy /= zLength;
    zz /= zLength;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    const xLength = Math.hypot(xx, xy, xz) || 1;
    xx /= xLength;
    xy /= xLength;
    xz /= xLength;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;
    const result = matrix4.identity();

    result[0] = xx;
    result[1] = yx;
    result[2] = zx;
    result[4] = xy;
    result[5] = yy;
    result[6] = zy;
    result[8] = xz;
    result[9] = yz;
    result[10] = zz;
    result[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    result[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    result[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    return result;
  },

  multiplyVector3(matrix, vector) {
    const [x, y, z] = vector;
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    ];
  },
};

export function createRotationMatrix(rotationX, rotationY, rotationZ) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  const xMatrix = new Float32Array([
    1, 0, 0, 0,
    0, cosX, sinX, 0,
    0, -sinX, cosX, 0,
    0, 0, 0, 1,
  ]);
  const yMatrix = new Float32Array([
    cosY, 0, -sinY, 0,
    0, 1, 0, 0,
    sinY, 0, cosY, 0,
    0, 0, 0, 1,
  ]);
  const zMatrix = new Float32Array([
    cosZ, sinZ, 0, 0,
    -sinZ, cosZ, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  return matrix4.multiply(matrix4.multiply(yMatrix, xMatrix), zMatrix);
}

export function transformPoint(matrix, x, y, z) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

export function createNormalMatrix(model, view) {
  const modelView = matrix4.multiply(view, model);
  return new Float32Array([
    modelView[0], modelView[1], modelView[2],
    modelView[4], modelView[5], modelView[6],
    modelView[8], modelView[9], modelView[10],
  ]);
}

function sphericalMixInto(destination, source, target, amount) {
  for (let index = 0; index < destination.length; index += 3) {
    const ax = source[index];
    const ay = source[index + 1];
    const az = source[index + 2];
    const bx = target[index];
    const by = target[index + 1];
    const bz = target[index + 2];
    const cosine = Math.max(
      -0.9995,
      Math.min(0.9995, ax * bx + ay * by + az * bz),
    );

    let x;
    let y;
    let z;

    if (cosine > 0.9975) {
      x = ax + (bx - ax) * amount;
      y = ay + (by - ay) * amount;
      z = az + (bz - az) * amount;
    } else {
      const angle = Math.acos(cosine);
      const denominator = Math.sin(angle);
      const sourceWeight = Math.sin((1 - amount) * angle) / denominator;
      const targetWeight = Math.sin(amount * angle) / denominator;
      x = ax * sourceWeight + bx * targetWeight;
      y = ay * sourceWeight + by * targetWeight;
      z = az * sourceWeight + bz * targetWeight;
    }

    const length = Math.hypot(x, y, z) || 1;
    destination[index] = x / length;
    destination[index + 1] = y / length;
    destination[index + 2] = z / length;
  }
}

function sequenceGlow(sequence, head, count, trailLength) {
  if (count <= 0 || trailLength <= 0) return 0;

  let behind = (head - sequence) % count;
  if (behind < 0) behind += count;
  if (behind > trailLength) return 0;

  let glow = (1 - behind / trailLength) ** 2;
  if (behind < 1) {
    glow = Math.max(glow, 0.55 + 0.45 * (1 - behind));
  }
  return glow;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader) || "shader compile failed";
    gl.deleteShader(shader);
    throw new Error(detail);
  }

  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Unable to create WebGL program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const detail = gl.getProgramInfoLog(program) || "program link failed";
    gl.deleteProgram(program);
    throw new Error(detail);
  }

  return program;
}

function createSphereGeometry(radius, longitudeSegments, latitudeSegments) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const polar = (latitude / latitudeSegments) * Math.PI;
    const radial = Math.sin(polar);
    const y = Math.cos(polar);

    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const azimuth = (longitude / longitudeSegments) * TAU;
      const x = Math.cos(azimuth) * radial;
      const z = Math.sin(azimuth) * radial;
      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const first = latitude * (longitudeSegments + 1) + longitude;
      const second = first + longitudeSegments + 1;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function bindAttribute(gl, program, name, buffer, size) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) throw new Error(`Shader attribute ${name} is unavailable`);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function uniforms(gl, program, names) {
  return Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  );
}

export function createWebGL2Renderer(
  gl,
  { pointCount = 1536, sphereRadius = 1.58 } = {},
) {
  const pointVertexShader = POINT_VERTEX_SHADER.replace(
    "__SPHERE_RADIUS__",
    sphereRadius.toFixed(2),
  );
  const pointProgram = createProgram(gl, pointVertexShader, POINT_FRAGMENT_SHADER);
  const shellProgram = createProgram(gl, SHELL_VERTEX_SHADER, SHELL_FRAGMENT_SHADER);

  const sourcePositionBuffer = gl.createBuffer();
  const targetPositionBuffer = gl.createBuffer();
  const sourceCrowdingBuffer = gl.createBuffer();
  const targetCrowdingBuffer = gl.createBuffer();
  const sourceSequenceBuffer = gl.createBuffer();
  const targetSequenceBuffer = gl.createBuffer();
  const pointBuffers = [
    sourcePositionBuffer,
    targetPositionBuffer,
    sourceCrowdingBuffer,
    targetCrowdingBuffer,
    sourceSequenceBuffer,
    targetSequenceBuffer,
  ];

  if (pointBuffers.some((buffer) => !buffer)) {
    throw new Error("Unable to allocate point buffers");
  }

  const uploadPoints = (
    sourcePositions,
    targetPositions,
    sourceCrowding,
    targetCrowding,
    sourceSequence,
    targetSequence,
  ) => {
    const arrays = [
      sourcePositions,
      targetPositions,
      sourceCrowding,
      targetCrowding,
      sourceSequence,
      targetSequence,
    ];

    pointBuffers.forEach((buffer, index) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, arrays[index], gl.DYNAMIC_DRAW);
    });
  };

  const shellGeometry = createSphereGeometry(sphereRadius * 0.994, 64, 42);
  const shellPositionBuffer = gl.createBuffer();
  const shellNormalBuffer = gl.createBuffer();
  const shellIndexBuffer = gl.createBuffer();

  if (!shellPositionBuffer || !shellNormalBuffer || !shellIndexBuffer) {
    throw new Error("Unable to allocate shell buffers");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, shellPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, shellGeometry.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, shellNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, shellGeometry.normals, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shellIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shellGeometry.indices, gl.STATIC_DRAW);

  const pointVao = gl.createVertexArray();
  const shellVao = gl.createVertexArray();
  if (!pointVao || !shellVao) throw new Error("Unable to allocate vertex arrays");

  gl.bindVertexArray(pointVao);
  bindAttribute(gl, pointProgram, "aPosition", sourcePositionBuffer, 3);
  bindAttribute(gl, pointProgram, "aTarget", targetPositionBuffer, 3);
  bindAttribute(gl, pointProgram, "aCrowding", sourceCrowdingBuffer, 1);
  bindAttribute(gl, pointProgram, "aTargetCrowding", targetCrowdingBuffer, 1);
  bindAttribute(gl, pointProgram, "aSequence", sourceSequenceBuffer, 1);
  bindAttribute(gl, pointProgram, "aTargetSequence", targetSequenceBuffer, 1);

  gl.bindVertexArray(shellVao);
  bindAttribute(gl, shellProgram, "aPosition", shellPositionBuffer, 3);
  bindAttribute(gl, shellProgram, "aNormal", shellNormalBuffer, 3);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shellIndexBuffer);
  gl.bindVertexArray(null);

  const pointUniforms = uniforms(gl, pointProgram, [
    "uProjection",
    "uView",
    "uModel",
    "uNormal",
    "uMix",
    "uPointScale",
    "uMorphPulse",
    "uLightDirection",
    "uSpacing",
    "uTheme",
    "uWalk",
    "uWalkHead",
    "uCount",
    "uWalkTrail",
    "uMaxPointSize",
  ]);
  const shellUniforms = uniforms(gl, shellProgram, [
    "uProjection",
    "uView",
    "uModel",
    "uNormal",
    "uTheme",
  ]);

  const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  const maximumPointSize =
    Array.isArray(pointSizeRange) || pointSizeRange instanceof Float32Array
      ? pointSizeRange[1]
      : 64;

  return {
    kind: "webgl2",
    maxPointSize: maximumPointSize,
    uploadPoints,

    draw({
      projection,
      view,
      model,
      light,
      mix,
      pulse,
      spacing,
      theme,
      pointScale,
      walk,
      walkHead,
      walkTrail = 16,
    }) {
      const normal = createNormalMatrix(model, view);
      const viewLight = matrix4.multiplyVector3(view, light);
      const themeValue = Number(theme === "uv");
      const boundedPointScale = Math.min(
        pointScale,
        Math.max(1, maximumPointSize),
      );

      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.enable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.depthMask(false);
      gl.blendFunc(
        theme === "uv" ? gl.ONE : gl.SRC_ALPHA,
        theme === "uv" ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA,
      );

      gl.useProgram(shellProgram);
      gl.bindVertexArray(shellVao);
      gl.uniformMatrix4fv(shellUniforms.uProjection, false, projection);
      gl.uniformMatrix4fv(shellUniforms.uView, false, view);
      gl.uniformMatrix4fv(shellUniforms.uModel, false, model);
      gl.uniformMatrix3fv(shellUniforms.uNormal, false, normal);
      gl.uniform1f(shellUniforms.uTheme, themeValue);
      gl.drawElements(
        gl.TRIANGLES,
        shellGeometry.indices.length,
        gl.UNSIGNED_SHORT,
        0,
      );

      gl.useProgram(pointProgram);
      gl.bindVertexArray(pointVao);
      gl.uniformMatrix4fv(pointUniforms.uProjection, false, projection);
      gl.uniformMatrix4fv(pointUniforms.uView, false, view);
      gl.uniformMatrix4fv(pointUniforms.uModel, false, model);
      gl.uniformMatrix3fv(pointUniforms.uNormal, false, normal);
      gl.uniform1f(pointUniforms.uMix, mix);
      gl.uniform1f(pointUniforms.uPointScale, boundedPointScale);
      gl.uniform1f(pointUniforms.uMorphPulse, pulse);
      gl.uniform3f(
        pointUniforms.uLightDirection,
        viewLight[0],
        viewLight[1],
        viewLight[2],
      );
      gl.uniform1f(pointUniforms.uSpacing, Number(Boolean(spacing)));
      gl.uniform1f(pointUniforms.uTheme, themeValue);
      gl.uniform1f(pointUniforms.uWalk, Number(Boolean(walk)));
      gl.uniform1f(pointUniforms.uWalkHead, walkHead ?? 0);
      gl.uniform1f(pointUniforms.uCount, pointCount);
      gl.uniform1f(pointUniforms.uWalkTrail, walkTrail);
      gl.uniform1f(pointUniforms.uMaxPointSize, Math.max(1, maximumPointSize));
      gl.drawArrays(gl.POINTS, 0, pointCount);
    },

    resize(width, height) {
      gl.viewport(0, 0, width, height);
    },

    dispose() {
      gl.deleteVertexArray(pointVao);
      gl.deleteVertexArray(shellVao);
      pointBuffers.forEach((buffer) => gl.deleteBuffer(buffer));
      gl.deleteBuffer(shellPositionBuffer);
      gl.deleteBuffer(shellNormalBuffer);
      gl.deleteBuffer(shellIndexBuffer);
      gl.deleteProgram(pointProgram);
      gl.deleteProgram(shellProgram);
    },
  };
}

export function createCanvas2DRenderer(
  canvas,
  { pointCount = 1536, sphereRadius = 1.58 } = {},
) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("2D canvas is unavailable");

  const mixedPositions = new Float32Array(pointCount * 3);
  const projectedPoints = Array.from({ length: pointCount }, () => ({
    x: 0,
    y: 0,
    z: 0,
    crowding: 0,
    facing: 0,
    glow: 0,
  }));

  return {
    kind: "canvas2d",
    maxPointSize: 64,
    uploadPoints() {},
    resize() {},

    draw({
      model,
      mix,
      spacing,
      theme,
      sourcePositions,
      targetPositions,
      sourceCrowding,
      targetCrowding,
      sourceSequence,
      targetSequence,
      walk,
      walkHead,
      walkTrail = 16,
      width,
      height,
      pixelRatio,
    }) {
      if (mix <= 0) {
        mixedPositions.set(sourcePositions);
      } else if (mix >= 1) {
        mixedPositions.set(targetPositions);
      } else {
        sphericalMixInto(mixedPositions, sourcePositions, targetPositions, mix);
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const screenRadius = (Math.min(canvas.width, canvas.height) * 0.38) / sphereRadius;

      for (let index = 0; index < pointCount; index += 1) {
        const [x, y, z] = transformPoint(
          model,
          mixedPositions[index * 3] * sphereRadius,
          mixedPositions[index * 3 + 1] * sphereRadius,
          mixedPositions[index * 3 + 2] * sphereRadius,
        );
        const crowding =
          sourceCrowding[index] +
          (targetCrowding[index] - sourceCrowding[index]) * mix;
        let glow = 0;

        if (walk && sourceSequence && targetSequence) {
          const sourceGlow = sequenceGlow(
            sourceSequence[index],
            walkHead,
            pointCount,
            walkTrail,
          );
          const targetGlow = sequenceGlow(
            targetSequence[index],
            walkHead,
            pointCount,
            walkTrail,
          );
          glow = sourceGlow + (targetGlow - sourceGlow) * mix;
        }

        Object.assign(projectedPoints[index], {
          x,
          y,
          z,
          crowding,
          facing: z / sphereRadius,
          glow,
        });
      }

      projectedPoints.sort((left, right) => left.z - right.z);
      context.clearRect(0, 0, canvas.width, canvas.height);

      const isUv = theme === "uv";
      const base = isUv ? [199, 188, 255] : [38, 31, 28];
      const crowded = isUv ? [230, 128, 89] : [156, 48, 56];
      const accent = isUv ? [181, 155, 255] : [156, 48, 56];
      const basePointSize = Math.max(
        1.15 * pixelRatio,
        Math.min(width, height) * 0.0042 * pixelRatio,
      );
      const walkRest = walk ? 0.36 : 1;

      context.save();
      for (const point of projectedPoints) {
        const crowdingAmount = spacing ? point.crowding : 0;
        let red = base[0] + (crowded[0] - base[0]) * crowdingAmount;
        let green = base[1] + (crowded[1] - base[1]) * crowdingAmount;
        let blue = base[2] + (crowded[2] - base[2]) * crowdingAmount;
        red += (accent[0] - red) * point.glow;
        green += (accent[1] - green) * point.glow;
        blue += (accent[2] - blue) * point.glow;

        const facing = 0.18 + 0.82 * Math.max(
          0,
          Math.min(1, (point.facing + 0.25) / 1.25),
        );
        const walkBrightness = walkRest + (1 - walkRest) * point.glow;
        const pointSize = basePointSize *
          (0.72 + 0.4 * ((point.z + sphereRadius) / (2 * sphereRadius))) *
          (1 + point.glow * 2);
        const alpha =
          (isUv ? 0.22 + 0.78 * facing : 0.28 + 0.62 * facing) *
          walkBrightness;

        context.beginPath();
        context.arc(
          centerX + point.x * screenRadius,
          centerY - point.y * screenRadius,
          pointSize,
          0,
          TAU,
        );
        context.fillStyle = `rgba(${red | 0}, ${green | 0}, ${blue | 0}, ${alpha})`;
        context.fill();
      }
      context.restore();
    },

    dispose() {},
  };
}

function getWebGL2Context(canvas) {
  return canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    depth: false,
  });
}

/**
 * Select the authored WebGL2 path first and fall back to Canvas2D. If WebGL2
 * acquires the original canvas but shader/program setup fails, a clone is used
 * because a canvas cannot switch context modes after acquisition.
 */
export function createPreferredRenderer(
  canvas,
  { pointCount = 1536, sphereRadius = 1.58 } = {},
) {
  let activeCanvas = canvas;
  let webgl2Error = null;
  let webgl2Context = null;

  try {
    webgl2Context = getWebGL2Context(activeCanvas);
    if (webgl2Context) {
      return {
        canvas: activeCanvas,
        renderer: createWebGL2Renderer(webgl2Context, {
          pointCount,
          sphereRadius,
        }),
        fallbackReason: null,
      };
    }
  } catch (error) {
    webgl2Error = error;
  }

  if (webgl2Context) {
    const replacement = activeCanvas.cloneNode(true);
    activeCanvas.replaceWith(replacement);
    activeCanvas = replacement;
  }

  return {
    canvas: activeCanvas,
    renderer: createCanvas2DRenderer(activeCanvas, {
      pointCount,
      sphereRadius,
    }),
    fallbackReason: webgl2Error,
  };
}
