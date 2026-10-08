import{i as e,n as t,r as n,t as r}from"./WaterHero.astro_astro_type_script_index_0_lang.Biv2xZqG.js";var i=`// One oversized triangle generated from gl_VertexID; no vertex buffers needed.
out vec2 vUv;

void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;function a(e,t,n){let r=e.createShader(t);if(!r)throw Error(`Could not create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`Shader compile failed: ${t}`)}return r}function o(e,t){return[`#version 300 es`,`precision highp float;`,...Object.entries(t).map(([e,t])=>`#define ${e} ${t}`),e].join(`
`)}function s(e,t,n={}){let r=a(e,e.VERTEX_SHADER,o(i,{})),s=a(e,e.FRAGMENT_SHADER,o(t,n)),c=e.createProgram();if(!c)throw Error(`Could not create program`);if(e.attachShader(c,r),e.attachShader(c,s),e.linkProgram(c),e.deleteShader(r),e.deleteShader(s),!e.getProgramParameter(c,e.LINK_STATUS)){let t=e.getProgramInfoLog(c);throw e.deleteProgram(c),Error(`Program link failed: ${t}`)}return c}function c(e,t,n){let r={};for(let i of n)r[i]=e.getUniformLocation(t,i);return r}function l(e){return!!(e.getExtension(`EXT_color_buffer_float`)||e.getExtension(`EXT_color_buffer_half_float`))}function u(e,t,n){let r=e.createTexture(),i=e.createFramebuffer();if(!r||!i)throw Error(`Could not allocate render target`);e.bindTexture(e.TEXTURE_2D,r),e.texStorage2D(e.TEXTURE_2D,1,e.RGBA16F,t,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0);let a=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),a!==e.FRAMEBUFFER_COMPLETE)throw Error(`Float render target is incomplete`);return{texture:r,framebuffer:i}}function d(e,t){e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}function f(e,t){let n=e.createTexture();if(!n)throw Error(`Could not allocate floor texture`);if(e.bindTexture(e.TEXTURE_2D,n),t){e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR);let n=e.getExtension(`EXT_texture_filter_anisotropic`);n&&e.texParameterf(e.TEXTURE_2D,n.TEXTURE_MAX_ANISOTROPY_EXT,4)}else{let t=new Uint8Array([214,232,236,255]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR)}return e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),n}var p={warmupFrames:20,windowFrames:60,budgetMs:24},m=class{options;seen=0;sum=0;count=0;constructor(e=p){this.options=e}push(e){if(this.seen+=1,this.seen<=this.options.warmupFrames||(this.sum+=e,this.count+=1,this.count<this.options.windowFrames))return!1;let t=this.sum/this.count;return this.sum=0,this.count=0,t>this.options.budgetMs}reset(){this.seen=0,this.sum=0,this.count=0}},h=[1.6,3],g=[2.6,6],_=6,ee=.028,v=1.1,y=2.5,b=([e,t],n)=>e+(t-e)*n();function x(e,t=Math.random){let n=null,[r,i,a,o]=e,s=(e,t)=>((e-r)/a)**2+((t-i)/o)**2<1;return{poll(e,r){if(n??=e+b(h,t),e<n||(n=e+b(g,t),r<y))return null;let i=.1+t()*.8,a=.1+t()*.8;for(let e=0;e<_&&s(i,a);e+=1)i=.1+t()*.8,a=.1+t()*.8;return{x0:i,y0:a,x1:i,y1:a,radius:ee,strength:v}}}}function S(e,t,n,{dprCap:r,maxPixels:i}){let a=Math.min(Math.max(n,1),r),o=e*t*a*a;return o>i&&(a*=Math.sqrt(i/o)),{width:Math.max(1,Math.round(e*a)),height:Math.max(1,Math.round(t*a))}}var C=[.28,.5,.5,.44],w=[.5,.52,.8,.36];function T(e){return e>=1?C:w}function E(e){if(!e)return null;let t=e.split(`,`).map(e=>Number(e.trim()));if(t.length!==4||t.some(e=>!Number.isFinite(e)))return null;let[n,r,i,a]=t;return i>0&&a>0?[n,r,i,a]:null}function D(e,t,n){return{x:(e-n.left)/n.width,y:1-(t-n.top)/n.height}}var O=.03,k=.13,A=6,j=.5,M=.05,N=1.3;function te(e,t){let n=null,r=null,i=1,a=0,o=t=>{let n=e.getBoundingClientRect();return i=n.width/Math.max(n.height,1),a=performance.now(),D(t.clientX,t.clientY,n)},s=e=>{n=o(e),r??=n},c=e=>{n=r=o(e),t({x0:n.x,y0:n.y,x1:n.x,y1:n.y,radius:M,strength:N})},l=()=>{n=r=null};return e.addEventListener(`pointermove`,s,{passive:!0}),e.addEventListener(`pointerdown`,c,{passive:!0}),e.addEventListener(`pointerleave`,l,{passive:!0}),e.addEventListener(`pointercancel`,l,{passive:!0}),e.addEventListener(`pointerup`,l,{passive:!0}),{flush(){if(!n||!r)return;let e=(n.x-r.x)*i,a=n.y-r.y,o=Math.hypot(e,a);o<.002||(t({x0:r.x,y0:r.y,x1:n.x,y1:n.y,radius:O,strength:Math.min(j,k+o*A)}),r=n)},get lastActivityMs(){return a},dispose(){e.removeEventListener(`pointermove`,s),e.removeEventListener(`pointerdown`,c),e.removeEventListener(`pointerleave`,l),e.removeEventListener(`pointercancel`,l),e.removeEventListener(`pointerup`,l)}}}var P={high:{dprCap:1.5,maxPixels:28e5,simLongSide:320,minFrameMs:0},mid:{dprCap:1,maxPixels:13e5,simLongSide:192,minFrameMs:0},low:{dprCap:1,maxPixels:7e5,simLongSide:0,minFrameMs:32}},F=`// Pool water seen from above: a refracted tiled floor lit by caustics, plus sun glints.
// Defines: SIM (1 = ripples from the height-field texture, 0 = analytic rings), RING_COUNT.
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uFloor;
uniform float uTime;
uniform float uAspect;        // canvas width / height
uniform float uPosterAspect;  // aspect of the poster the canvas must line up with
uniform vec4 uSafe;           // calm zone ellipse in poster space: centre.xy, radius.xy

#if SIM
uniform sampler2D uHeight;
uniform vec2 uTexel;
uniform vec2 uRipple;         // world slope per texel difference, world curvature per texel^2
#else
uniform vec4 uRings[RING_COUNT]; // x, y (canvas uv), birth time, amplitude
#endif

const vec3 ABYSS = vec3(0.024, 0.071, 0.122);
const vec3 DEEP = vec3(0.043, 0.165, 0.271);
const vec3 AQUA = vec3(0.184, 0.827, 0.902);
const vec3 FOAM = vec3(0.914, 0.969, 0.973);
const vec3 COPPER = vec3(0.878, 0.478, 0.247);

const float FLOOR_REPEAT = 2.8;  // floor texture spans 1/2.8 of a hero height
const vec2 SUN_POS = vec2(0.9, 0.92);
const vec3 SUN_HALF = normalize(vec3(0.14, 0.10, 0.985) + vec3(0.0, 0.0, 1.0));

// Ambient swell: a few crossing waves, each described by angle, wavenumber, slope amplitude, phase.
const int WAVE_COUNT = 8;
const vec4 WAVES[WAVE_COUNT] = vec4[WAVE_COUNT](
  vec4(2.90, 9.0, 0.030, 0.4),
  vec4(0.90, 14.0, 0.022, 2.1),
  vec4(2.30, 22.0, 0.014, 4.0),
  vec4(2.55, 33.0, 0.011, 1.3),
  vec4(0.15, 49.0, 0.0078, 5.2),
  vec4(1.38, 71.0, 0.0053, 3.3),
  vec4(0.78, 97.0, 0.0040, 0.9),
  vec4(1.98, 131.0, 0.0030, 2.6)
);

// Gradient g and curvature h of the ambient surface at p.
void ambientWaves(vec2 p, float t, out vec2 g, out mat2 h) {
  g = vec2(0.0);
  h = mat2(0.0);
  p += 0.035 * vec2(sin(p.y * 5.3 + t * 0.31), sin(p.x * 4.1 - t * 0.27));
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 w = WAVES[i];
    vec2 d = vec2(cos(w.x), sin(w.x));
    float phase = dot(d, p) * w.y + sqrt(w.y) * 0.6 * t + w.w;
    g += d * (w.z * cos(phase));
    // Long swells bend the floor but should not blur the caustic web, so they curve less.
    float curvature = mix(0.15, 1.0, smoothstep(8.0, 40.0, w.y));
    h += (-w.z * w.y * curvature * sin(phase)) * mat2(d.x * d.x, d.x * d.y, d.x * d.y, d.y * d.y);
  }
}

#if SIM
// Ripples read back from the simulation texture (central differences).
void rippleField(out vec2 g, out mat2 h) {
  vec2 e = uTexel;
  float c = texture(uHeight, vUv).r;
  float l = texture(uHeight, vUv - vec2(e.x, 0.0)).r;
  float r = texture(uHeight, vUv + vec2(e.x, 0.0)).r;
  float d = texture(uHeight, vUv - vec2(0.0, e.y)).r;
  float u = texture(uHeight, vUv + vec2(0.0, e.y)).r;
  float dl = texture(uHeight, vUv - e).r;
  float ur = texture(uHeight, vUv + e).r;
  float ul = texture(uHeight, vUv + vec2(-e.x, e.y)).r;
  float dr = texture(uHeight, vUv + vec2(e.x, -e.y)).r;
  g = vec2(r - l, u - d) * 0.5 * uRipple.x;
  float diagonal = (ur + dl - ul - dr) * 0.25;
  h = mat2(r + l - 2.0 * c, diagonal, diagonal, u + d - 2.0 * c) * uRipple.y;
}
#else
// Low tier: a few expanding wave packets stand in for the simulation.
void rippleField(out vec2 g, out mat2 h) {
  g = vec2(0.0);
  h = mat2(0.0);
  vec2 aspect = vec2(uAspect, 1.0);
  const float K = 70.0;
  const float W = 0.05;
  for (int i = 0; i < RING_COUNT; i++) {
    vec4 ring = uRings[i];
    float age = uTime - ring.z;
    if (ring.w <= 0.0 || age < 0.0) continue;

    vec2 d = (vUv - ring.xy) * aspect;
    float r = length(d);
    vec2 dir = d / max(r, 1e-4);
    float x = r - (0.01 + 0.16 * age);
    float env = exp(-(x * x) / (W * W));
    float amp = 0.0017 * ring.w * exp(-age * 0.9);
    float osc = cos(K * x);
    float osn = sin(K * x);
    float slope = amp * env * (-2.0 * x / (W * W) * osc - K * osn);
    float curve = amp * env * ((4.0 * x * x / pow(W, 4.0) - 2.0 / (W * W)) * osc + 4.0 * x * K / (W * W) * osn - K * K * osc);
    mat2 radial = mat2(dir.x * dir.x, dir.x * dir.y, dir.x * dir.y, dir.y * dir.y);
    g += dir * slope;
    h += (curve * radial + slope / max(r, 0.03) * (mat2(1.0) - radial)) * 0.4;
  }
}
#endif

void main() {
  // World position in hero-height units, cropped exactly like the poster (object-fit: cover).
  float crop = min(1.0, uPosterAspect / uAspect);
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * crop;
  vec2 posterUv = 0.5 + p / vec2(uPosterAspect, 1.0);
  float t = uTime;

  // Calmer, darker water where the headline sits.
  float calm = 1.0 - smoothstep(0.3, 1.0, length((posterUv - uSafe.xy) / uSafe.zw));

  // Shallow ledge in the sunlit top-right, deep water bottom-left.
  float deepness = clamp(0.6 - 0.5 * (posterUv.x - 0.5) - 0.42 * (posterUv.y - 0.5)
    + 0.08 * sin(posterUv.x * 3.1 + 1.0) * sin(posterUv.y * 2.3), 0.0, 1.0);
  float depth = mix(0.32, 1.05, deepness);
  float sunSide = smoothstep(1.05, 0.0, length((posterUv - SUN_POS) * vec2(1.0, 1.25)));

  // Surface: two ambient wave sets plus the interactive ripples.
  vec2 gA, gB;
  mat2 hA, hB;
  ambientWaves(p, t, gA, hA);
  ambientWaves(p * 1.31 + vec2(3.7, 1.9), t * 1.17 + 4.0, gB, hB);
  vec2 gR;
  mat2 hR;
  rippleField(gR, hR);
  float swell = 1.0 - 0.55 * calm;
  vec2 grad = (gA + 0.7 * gB) * swell + gR * (1.0 - 0.4 * calm);
  mat2 curv = (hA + 0.7 * hB) * swell + hR * (1.0 - 0.4 * calm);

  // Floor seen through the surface (refraction shifts the lookup).
  vec2 floorP = p + grad * depth * 1.2;
  vec3 tile = textureGrad(uFloor, floorP * FLOOR_REPEAT, dFdx(p) * FLOOR_REPEAT, dFdy(p) * FLOOR_REPEAT).rgb * vec3(0.6, 0.93, 1.0);

  // Caustics: light density is the inverse of how much the refracted ray bundle stretches.
  mat2 bend = curv * (depth * 1.7);
  float stretch = (1.0 + bend[0][0]) * (1.0 + bend[1][1]) - bend[0][1] * bend[1][0];
  float focus = 1.0 / max(abs(stretch), 0.1);
  float caustic = 0.14 * clamp(focus, 0.0, 2.0) + 1.5 * smoothstep(1.9, 6.0, focus);

  float sparkle = smoothstep(3.0, 8.0, focus);
  vec3 sunlight = mix(vec3(0.78, 0.97, 1.0), vec3(1.0, 0.9, 0.78), 0.25 * sunSide);
  float light = 0.34 + caustic * (1.0 - 0.7 * calm);
  vec3 lit = tile * light * sunlight;

  // Water column: red fades first, a little scatter lifts the deep end toward blue-green.
  vec3 transmit = exp(-depth * vec3(1.6, 0.6, 0.34));
  vec3 scatter = mix(DEEP, AQUA * 0.32, 0.45 * (1.0 - deepness));
  vec3 color = lit * transmit + (1.0 - transmit) * scatter;
  color = mix(color, DEEP * 0.55, calm * 0.62);
  color += mix(FOAM, vec3(1.0, 0.9, 0.76), sunSide) * sparkle * 0.55 * (1.0 - 0.8 * calm);

  // Surface sheen and sun glints on steep facets.
  vec3 normal = normalize(vec3(-grad, 1.0));
  float facet = 1.0 - normal.z;
  vec3 sky = mix(AQUA * 0.22, vec3(0.62, 0.36, 0.26) * 0.4, sunSide);
  color += sky * (0.05 + 2.4 * facet);
  float glint = pow(max(dot(normal, SUN_HALF), 0.0), 700.0) * 1.1
    + pow(max(dot(normal, SUN_HALF), 0.0), 70.0) * 0.035;
  color += mix(FOAM, COPPER, 0.35) * glint * (0.4 + 0.9 * sunSide) * (1.0 - 0.8 * calm);
  color += COPPER * 0.13 * pow(sunSide, 3.0) * (1.0 - calm);

  // Edge falloff toward the abyss, then a static dither against banding in the darks.
  float vignette = smoothstep(0.35, 1.05, length((vUv - 0.5) * vec2(1.15, 1.0)));
  color = mix(color, ABYSS, vignette * 0.55);
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  color = color / (1.0 + 0.45 * color) * 1.2;
  color += (noise - 0.5) / 255.0;

  fragColor = vec4(color, 1.0);
}
`,I=`// Height-field wave step. State per texel: R = height, G = velocity.
in vec2 vUv;
out vec4 fragState;

uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uAspect;
// Capsule swept by the pointer this step: start.xy, end.xy (canvas uv).
uniform vec4 uSegment;
// x = radius (canvas height units), y = strength (0 disables the drop).
uniform vec2 uDrop;

const float SPRING = 1.75;        // < 2.0 keeps the 5-point wave equation stable
const float DAMPING = 0.9958;
const float EDGE_DAMPING = 0.86;  // soaks up waves near the border instead of echoing them
const float PI = 3.14159265;

float distanceToSegment(vec2 point, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(point - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
  return length(point - (a + ab * t));
}

void main() {
  vec2 state = texture(uPrev, vUv).rg;
  float neighbours =
    texture(uPrev, vUv + vec2(uTexel.x, 0.0)).r + texture(uPrev, vUv - vec2(uTexel.x, 0.0)).r +
    texture(uPrev, vUv + vec2(0.0, uTexel.y)).r + texture(uPrev, vUv - vec2(0.0, uTexel.y)).r;

  float edge = smoothstep(0.0, 0.04, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  state.g += (neighbours * 0.25 - state.r) * SPRING;
  state.g *= mix(EDGE_DAMPING, DAMPING, edge);
  state.r += state.g;

  if (uDrop.y > 0.0) {
    vec2 scale = vec2(uAspect, 1.0);
    float d = distanceToSegment(vUv * scale, uSegment.xy * scale, uSegment.zw * scale);
    float falloff = clamp(1.0 - d / uDrop.x, 0.0, 1.0);
    state.r += (0.5 - 0.5 * cos(falloff * PI)) * uDrop.y;
  }

  fragState = vec4(state, 0.0, 1.0);
}
`,L=[`uPrev`,`uTexel`,`uAspect`,`uSegment`,`uDrop`];function R(e,t){return e>=1?{width:t,height:Math.max(8,Math.round(t/e))}:{width:Math.max(8,Math.round(t*e)),height:t}}var z=class{gl;aspect;width;height;program;uniforms;read;write;constructor(e,t,n){this.gl=e,this.aspect=t,{width:this.width,height:this.height}=R(t,n),this.program=s(e,I),this.uniforms=c(e,this.program,L),this.read=u(e,this.width,this.height),this.write=u(e,this.width,this.height)}get texture(){return this.read.texture}step(e){let{gl:t,uniforms:n}=this;t.bindFramebuffer(t.FRAMEBUFFER,this.write.framebuffer),t.viewport(0,0,this.width,this.height),t.useProgram(this.program),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.read.texture),t.uniform1i(n.uPrev,0),t.uniform2f(n.uTexel,1/this.width,1/this.height),t.uniform1f(n.uAspect,this.aspect),e?(t.uniform4f(n.uSegment,e.x0,e.y0,e.x1,e.y1),t.uniform2f(n.uDrop,e.radius,e.strength)):t.uniform2f(n.uDrop,1,0),t.drawArrays(t.TRIANGLES,0,3),t.bindFramebuffer(t.FRAMEBUFFER,null),[this.read,this.write]=[this.write,this.read]}dispose(){d(this.gl,this.read),d(this.gl,this.write),this.gl.deleteProgram(this.program)}},B=6,V=90,H=3,U=6,W=.0032,G=.4,K=[`uFloor`,`uTime`,`uAspect`,`uPosterAspect`,`uSafe`,`uHeight`,`uTexel`,`uRipple`,`uRings`],q=class{gl;options;program;uniforms;floorTexture;vao;quality;rings=new Float32Array(24);sim=null;queuedDrops=[];width=1;height=1;time=11;nextRing=0;stepDebt=0;constructor(e,t){this.gl=e,this.options=t,this.quality=P[t.tier];let n=this.quality.simLongSide>0;this.program=s(e,F,{SIM:+!!n,RING_COUNT:B}),this.uniforms=c(e,this.program,K),this.floorTexture=f(e,t.floor);let r=e.createVertexArray();if(!r)throw Error(`Could not create vertex array`);this.vao=r}resize(e,t){this.width=e,this.height=t,this.sim?.dispose(),this.sim=this.quality.simLongSide>0?new z(this.gl,e/t,this.quality.simLongSide):null,this.queuedDrops=[]}addDrop(e){if(this.sim){this.queuedDrops.length<U&&this.queuedDrops.push(e);return}let t=this.nextRing*4;this.rings.set([e.x1,e.y1,this.time,Math.min(e.strength*1.6,2.2)],t),this.nextRing=(this.nextRing+1)%B}update(e){if(!this.sim)return;this.stepDebt+=e*V;let t=Math.min(H,Math.max(1,Math.floor(this.stepDebt)));this.stepDebt=Math.max(0,this.stepDebt-t);for(let e=0;e<t;e+=1)this.sim.step(this.queuedDrops.shift()??null)}render(e){let{gl:t,uniforms:n,sim:r}=this;if(this.time=e,t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.width,this.height),t.useProgram(this.program),t.bindVertexArray(this.vao),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.floorTexture),t.uniform1i(n.uFloor,0),t.uniform1f(n.uTime,e),t.uniform1f(n.uAspect,this.width/this.height),t.uniform1f(n.uPosterAspect,this.options.posterAspect),t.uniform4f(n.uSafe,...this.options.safeZone),r){t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,r.texture),t.uniform1i(n.uHeight,1),t.uniform2f(n.uTexel,1/r.width,1/r.height);let e=W*r.height;t.uniform2f(n.uRipple,e,e*r.height*G)}else t.uniform4fv(n.uRings,this.rings);t.drawArrays(t.TRIANGLES,0,3)}dispose(){this.sim?.dispose(),this.gl.deleteProgram(this.program),this.gl.deleteTexture(this.floorTexture),this.gl.deleteVertexArray(this.vao)}},J=250,Y=.1,X=class{root;canvas;gl;floor;monitor=new m;pointer;resizeObserver;visibilityObserver;tier;renderer;posterAspect;safeZone;idle;clock=11;lastRenderAt=0;rafId=null;resizeQueued=!1;isVisible=!0;isContextLost=!1;isReady=!1;isRevealQueued=!1;isDisposed=!1;constructor(t){({root:this.root,canvas:this.canvas,gl:this.gl,floor:this.floor}=t),this.tier=t.tier,this.posterAspect=this.readPosterAspect(t.fallbackPosterAspect),this.safeZone=this.readSafeZone(),this.idle=x(this.safeZone),this.renderer=this.createRenderer(),this.applySize(!0),this.pointer=te(this.root,e=>this.renderer.addDrop(e)),this.resizeObserver=new ResizeObserver(()=>this.queueResize()),this.resizeObserver.observe(this.root),this.visibilityObserver=new IntersectionObserver(e=>{this.isVisible=e.some(e=>e.isIntersecting),this.syncLoop()}),this.visibilityObserver.observe(this.root),document.addEventListener(`visibilitychange`,this.syncLoop),this.canvas.addEventListener(`webglcontextlost`,this.onContextLost),this.canvas.addEventListener(`webglcontextrestored`,this.onContextRestored),this.root.setAttribute(e,this.tier),this.syncLoop()}dispose(){this.isDisposed||(this.isDisposed=!0,this.stopLoop(),this.pointer.dispose(),this.resizeObserver.disconnect(),this.visibilityObserver.disconnect(),document.removeEventListener(`visibilitychange`,this.syncLoop),this.canvas.removeEventListener(`webglcontextlost`,this.onContextLost),this.canvas.removeEventListener(`webglcontextrestored`,this.onContextRestored),this.isContextLost||this.renderer.dispose(),this.canvas.remove(),this.root.setAttribute(n,`false`),this.root.setAttribute(e,`off`))}readPosterAspect(e){let t=this.root.querySelector(`img`);return t&&t.naturalWidth>0&&t.naturalHeight>0?t.naturalWidth/t.naturalHeight:e}readSafeZone(){return E(this.root.dataset.waterSafe)??T(this.posterAspect)}createRenderer(){return l(this.gl),new q(this.gl,{tier:this.tier,floor:this.floor,posterAspect:this.posterAspect,safeZone:this.safeZone})}rebuildRenderer(){this.isContextLost||this.renderer.dispose(),this.renderer=this.createRenderer(),this.applySize(!0),this.monitor.reset()}applySize(e=!1){let{clientWidth:t,clientHeight:n}=this.root;if(t===0||n===0)return;let r=S(t,n,window.devicePixelRatio,P[this.tier]);(e||r.width!==this.canvas.width||r.height!==this.canvas.height)&&(this.canvas.width=r.width,this.canvas.height=r.height,this.renderer.resize(r.width,r.height))}queueResize(){this.resizeQueued||(this.resizeQueued=!0,requestAnimationFrame(()=>{if(this.resizeQueued=!1,this.isDisposed||this.isContextLost)return;let e=this.readPosterAspect(this.posterAspect);Math.abs(e-this.posterAspect)>.01?(this.posterAspect=e,this.safeZone=this.readSafeZone(),this.idle=x(this.safeZone),this.rebuildRenderer()):this.applySize()}))}syncLoop=()=>{let e=this.isVisible&&!document.hidden&&!this.isContextLost;e&&this.rafId===null?(this.lastRenderAt=0,this.monitor.reset(),this.rafId=requestAnimationFrame(this.frame)):e||this.stopLoop()};stopLoop(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null}frame=n=>{this.rafId=requestAnimationFrame(this.frame);let r=P[this.tier];if(this.lastRenderAt&&n-this.lastRenderAt<r.minFrameMs-1)return;let i=this.lastRenderAt?n-this.lastRenderAt:1e3/60;this.lastRenderAt=n,i>J&&this.monitor.reset();let a=Math.min(i/1e3,Y);this.clock+=a,this.pointer.flush();let o=this.pointer.lastActivityMs?(performance.now()-this.pointer.lastActivityMs)/1e3:1/0,s=this.idle.poll(this.clock,o);s&&this.renderer.addDrop(s),this.renderer.update(a),this.renderer.render(this.clock),this.revealOnceDrawn(),this.tier!==`low`&&i<=J&&this.monitor.push(i)&&(this.tier=t(this.tier),this.root.setAttribute(e,this.tier),this.rebuildRenderer())};revealOnceDrawn(){this.isReady||this.isRevealQueued||(this.isRevealQueued=!0,requestAnimationFrame(()=>requestAnimationFrame(()=>{this.isRevealQueued=!1,!(this.isDisposed||this.isContextLost)&&(this.isReady=!0,this.root.setAttribute(n,`true`))})))}onContextLost=e=>{e.preventDefault(),this.isContextLost=!0,this.isReady=!1,this.root.setAttribute(n,`false`),this.syncLoop()};onContextRestored=()=>{try{this.isContextLost=!1,this.renderer=this.createRenderer(),this.applySize(!0),this.syncLoop()}catch(e){console.warn(`Water hero could not recover after context loss.`,e),this.dispose()}}},Z=16/9;function Q(){let e=document.createElement(`canvas`);return e.setAttribute(`aria-hidden`,`true`),e.setAttribute(`data-water-canvas`,``),e}function ne(e){if(!e)return Promise.resolve(null);let t=new Image;return t.decoding=`async`,t.src=e,t.decode().then(()=>t,()=>null)}function $(t){t.setAttribute(e,`off`),t.setAttribute(n,`false`)}async function re(e,t){let n=Q(),i=n.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1}),a=r({...t,hasWebGL2:i!==null,hasFloatRenderTarget:i!==null&&l(i)});if(!i||a===`off`)return $(e),null;let o=await ne(e.dataset.waterFloor);try{let t=new X({root:e,canvas:n,gl:i,tier:a,floor:o,fallbackPosterAspect:Z}),r=e.querySelector(`img`),s=r?.closest(`picture`)??r;return s?s.after(n):e.prepend(n),t}catch(t){return console.warn(`Water hero could not start, showing the poster.`,t),$(e),null}}export{re as mountWater};