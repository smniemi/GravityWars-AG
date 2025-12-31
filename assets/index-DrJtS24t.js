var St=Object.defineProperty;var Et=(n,e,t)=>e in n?St(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var l=(n,e,t)=>Et(n,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function t(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=t(i);fetch(i.href,o)}})();const D=32,Ie=254,Tt=256,At=Tt*3,de=16;function Xe(n){const e=Ze(n,"get_palette_buffer")(),t=new Uint8Array(n.HEAPU8.buffer,e,At),s=Ze(n,"get_block_buffer")(),i=new Uint8Array(n.HEAPU8.buffer,s,Ie*D*D),o=document.createElement("canvas"),r=Math.ceil(Ie/de);o.width=de*D,o.height=r*D;const a=o.getContext("2d",{willReadFrequently:!1});if(!a)throw new Error("Unable to create atlas context");const c=a.createImageData(D,D),h=[];for(let u=0;u<Ie;u++){const d=u*D*D;for(let w=0;w<D*D;w++){const y=i[d+w]??0,L=y*3,B=t[L]??0,_=t[L+1]??0,k=t[L+2]??0,E=w*4;c.data[E]=Le(B),c.data[E+1]=Le(_),c.data[E+2]=Le(k);const C=y===0||y>=176&&y<=190,I=y>=192&&y<=194;C?c.data[E+3]=0:I?c.data[E+3]=254:y===196?c.data[E+3]=253:c.data[E+3]=255}const v=u%de,f=Math.floor(u/de),p=v*D,m=f*D;a.putImageData(c,p,m),h.push({sx:p,sy:m})}return{canvas:o,tileSize:D,positions:h}}function Le(n){return Math.min(255,Math.round(n/63*255))}function Ze(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}class _t{constructor(){l(this,"context",null);l(this,"buffers",new Map);l(this,"musicBuffers",new Map);l(this,"enabled",!1);l(this,"lastState",null);l(this,"thrustSource",null);l(this,"musicSource",null);l(this,"musicGain",null);l(this,"currentTrack",null);l(this,"activeActionIds",new Set);l(this,"wasInWater",!1);l(this,"lastWallHitTime",0);l(this,"SOUNDS",{key:"sounds/key2.wav",cling:"sounds/cling.wav",splash:"sounds/splash2.wav",happy:"sounds/finish.wav",whoosh:"sounds/whoosh2.wav",explode:"sounds/explode2.wav",wallhit:"sounds/wallhit.wav",thrust:"sounds/aircraft008.wav",punch:"sounds/punch.wav"});l(this,"MUSIC",["music/Gw1.m4r","music/Gw2.m4r","music/Gw3.m4r","music/Gw4.m4r","music/Gw5.m4r"]);l(this,"sfxGain",null);this.init(),this.bindResumeEvents()}bindResumeEvents(){const e=()=>{var t;((t=this.context)==null?void 0:t.state)==="suspended"&&this.context.resume().then(()=>{console.log("[SoundManager] AudioContext resumed successfully")}).catch(s=>{console.warn("[SoundManager] AudioContext resume failed:",s)})};["click","keydown","touchstart","touchend","mousedown"].forEach(t=>{window.addEventListener(t,e,{passive:!0})})}async init(){if(!this.context)try{const e=window.AudioContext||window.webkitAudioContext;this.context=new e({latencyHint:"interactive"}),this.musicGain=this.context.createGain(),this.musicGain.gain.value=.4,this.musicGain.connect(this.context.destination),this.sfxGain=this.context.createGain(),this.sfxGain.gain.value=1,this.sfxGain.connect(this.context.destination),await Promise.all([this.loadSounds(),this.loadMusic()]),this.enabled=!0,console.log("[SoundManager] Audio initialized and pre-loaded"),this.lastState&&this.playMusic(this.lastState.levelnum)}catch(e){console.error("[SoundManager] Failed to init audio",e)}}async loadSounds(){if(!this.context)return;const e=Object.entries(this.SOUNDS).map(async([t,s])=>{try{const i=await this.fetchAndDecode(s);this.buffers.set(t,i)}catch(i){console.warn(`[SoundManager] Failed to load sound ${t}: ${s}`,i)}});await Promise.all(e)}async loadMusic(){if(!this.context)return;const e=this.MUSIC.map(async t=>{try{const s=await this.fetchAndDecode(t);this.musicBuffers.set(t,s)}catch(s){console.warn(`[SoundManager] Failed to load music: ${t}`,s)}});await Promise.all(e)}setSfxVolume(e){this.sfxGain&&this.sfxGain.gain.setTargetAtTime(e,this.context.currentTime,.1)}async fetchAndDecode(e){const s=await(await fetch(e)).arrayBuffer();return await this.context.decodeAudioData(s)}playEffect(e){!this.enabled||!this.context||Promise.resolve().then(()=>{if(e==="wallhit"){const t=performance.now();if(t-this.lastWallHitTime<50)return;this.lastWallHitTime=t}this.play(e)})}playMusic(e=1){if(!this.enabled||!this.context||!this.musicGain)return;this.context.state==="suspended"&&this.context.resume().catch(()=>{});const t=e<=0?10:e,s=(t-1)%this.MUSIC.length,i=this.MUSIC[s];if(console.log(`[SoundManager] playMusic requested for level: ${e}. Effective: ${t}. Track: ${i}`),i===this.currentTrack)return;const o=this.musicBuffers.get(i);if(!o){console.warn(`[SoundManager] Music buffer not ready for: ${i}`);return}try{this.musicSource&&this.musicSource.stop(),this.musicSource=this.context.createBufferSource(),this.musicSource.buffer=o,this.musicSource.loop=!0,this.musicSource.connect(this.musicGain),this.musicSource.start(),this.currentTrack=i,console.log(`[SoundManager] Playing music: ${i}`)}catch(r){console.warn(`[SoundManager] Failed to play music ${i}`,r)}}play(e,t=!1){if(!this.enabled||!this.context)return null;this.context.state==="suspended"&&this.context.resume();const s=this.buffers.get(e);if(!s)return null;const i=this.context.createBufferSource();return i.buffer=s,i.loop=t,i.connect(this.sfxGain||this.context.destination),i.start(),i}update(e,t,s){if(!this.lastState){this.lastState={...e},this.playMusic(e.levelnum);return}if(e.numKeys<this.lastState.numKeys&&this.playEffect("key"),(e.shipScore>this.lastState.shipScore||e.shipFuel>this.lastState.shipFuel)&&e.shipScore!==this.lastState.shipScore&&this.playEffect("cling"),e.shipState===2&&this.lastState.shipState!==2&&this.playEffect("explode"),e.levelnum!==this.lastState.levelnum&&(this.playEffect("happy"),this.playMusic(e.levelnum)),e.shipThrust>0&&!this.thrustSource)this.thrustSource=this.play("thrust",!0);else if(e.shipThrust===0&&this.thrustSource){try{this.thrustSource.stop()}catch{}this.thrustSource=null}if(s){const o=Math.floor(((e.sx>>10)+16)/32),r=Math.floor(((e.sy>>10)+16)/32);if(o>=0&&o<s.width){const a=r*s.width+o;if(a<s.objects.length){const c=s.objects[a],h=c===119||c===118;h&&!this.wasInWater&&this.playEffect("splash"),this.wasInWater=h}}}const i=new Set;for(const o of t)o.active&&(i.add(o.id),this.activeActionIds.has(o.id)||(o.start===48?this.playEffect("wallhit"):o.start===113&&this.playEffect("splash")));this.activeActionIds=i,this.lastState={...e}}}const F=32,rt=32,at=rt*F*F,Fe=F*F;function Se(n,e){const t=Ce(n,"get_palette_buffer")(),s=Ce(n,"get_ship_buffer")(),i=Ce(n,"get_block_buffer")(),o=new Uint8Array(n.HEAPU8.buffer,t,256*3),r=new Uint8Array(n.HEAPU8.buffer,s,at*4),a=new Uint8Array(n.HEAPU8.buffer,i,254*Fe),c=Lt(o);return{noThrust:Je(r,0,c),thrust:Je(r,2,c),specials:It(a,c,e)}}function Je(n,e,t){const s=[],i=e*at;for(let o=0;o<rt;o++){const r=document.createElement("canvas");r.width=F,r.height=F;const a=r.getContext("2d");if(!a)continue;const c=a.createImageData(F,F),h=c.data,u=i+o*F*F;for(let d=0;d<F*F;d++){const v=n[u+d],[f,p,m,w]=t[v]??[0,0,0,0],y=d*4;h[y]=f,h[y+1]=p,h[y+2]=m,h[y+3]=w}a.putImageData(c,0,0),s[o]=r}return s}function It(n,e,t){const s={};return t.forEach(i=>{const o=document.createElement("canvas");o.width=F,o.height=F;const r=o.getContext("2d");if(!r)return;const a=r.createImageData(F,F),c=a.data,h=i*Fe;for(let u=0;u<Fe;u++){const d=n[h+u],[v,f,p]=e[d]??[0,0,0,0],m=u*4;c[m]=v,c[m+1]=f,c[m+2]=p,c[m+3]=d===0?0:255}r.putImageData(a,0,0),s[i]=o}),s}function Lt(n){const e=Array.from({length:256},()=>[0,0,0,0]);for(let t=0;t<256;t++){const s=n[t*3]??0,i=n[t*3+1]??0,o=n[t*3+2]??0;e[t]=[Pe(s),Pe(i),Pe(o),t===0?0:255]}return e}function Pe(n){return Math.min(255,Math.round(n/63*255))}function Ce(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}const fe=F;function Pt(n){const e=n.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!e)throw new Error("WebGL2 not supported");return e}function Ct(n,e=1){const t=n.clientWidth*e|0,s=n.clientHeight*e|0;return n.width!==t||n.height!==s?(n.width=t,n.height=s,!0):!1}class lt{constructor(e,t,s){l(this,"program");l(this,"gl");l(this,"uniforms",{});l(this,"attributes",{});this.gl=e;const i=this.compileShader(e.VERTEX_SHADER,t),o=this.compileShader(e.FRAGMENT_SHADER,s);this.program=this.createProgram(i,o)}use(){this.gl.useProgram(this.program)}getUniformLocation(e){if(this.uniforms[e]===void 0){const t=this.gl.getUniformLocation(this.program,e);t||console.warn(`Uniform ${e} not found`),this.uniforms[e]=t}return this.uniforms[e]}getAttributeLocation(e){if(this.attributes[e]===void 0){const t=this.gl.getAttribLocation(this.program,e);t===-1&&console.warn(`Attribute ${e} not found`),this.attributes[e]=t}return this.attributes[e]}compileShader(e,t){const s=this.gl.createShader(e);if(!s)throw new Error("Failed to create shader");if(this.gl.shaderSource(s,t),this.gl.compileShader(s),!this.gl.getShaderParameter(s,this.gl.COMPILE_STATUS)){const i=this.gl.getShaderInfoLog(s);throw this.gl.deleteShader(s),new Error(`Could not compile shader: ${i}`)}return s}createProgram(e,t){const s=this.gl.createProgram();if(!s)throw new Error("Failed to create program");if(this.gl.attachShader(s,e),this.gl.attachShader(s,t),this.gl.linkProgram(s),!this.gl.getProgramParameter(s,this.gl.LINK_STATUS)){const i=this.gl.getProgramInfoLog(s);throw this.gl.deleteProgram(s),new Error(`Could not link program: ${i}`)}return s}}const kt=`#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  // Apply camera and zoom
  vec2 position = (a_position - u_camera) * u_zoom;
  
  // Convert to clip space (-1 to +1)
  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  v_texCoord = a_texCoord;
  v_color = a_color;
}
`,Rt=`#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec4 v_color;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  outColor = texColor * v_color;
  if (outColor.a < 0.1) discard;
}
`,Qe=2e3,pe=6,se=8;class Ft{constructor(e){l(this,"gl");l(this,"shader");l(this,"vao");l(this,"vertexBuffer");l(this,"vertexData");l(this,"spriteCount");l(this,"currentTexture",null);this.gl=e,this.shader=new lt(e,kt,Rt),this.vertexData=new Float32Array(Qe*pe*se),this.spriteCount=0;const t=e.createVertexArray();if(!t)throw new Error("Failed to create VAO");this.vao=t,e.bindVertexArray(t);const s=e.createBuffer();if(!s)throw new Error("Failed to create buffer");this.vertexBuffer=s,e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,this.vertexData.byteLength,e.DYNAMIC_DRAW);const i=this.shader.getAttributeLocation("a_position");e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,se*4,0);const o=this.shader.getAttributeLocation("a_texCoord");e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,se*4,2*4);const r=this.shader.getAttributeLocation("a_color");e.enableVertexAttribArray(r),e.vertexAttribPointer(r,4,e.FLOAT,!1,se*4,4*4),e.bindVertexArray(null)}begin(e,t,s){this.shader.use(),this.gl.uniform2f(this.shader.getUniformLocation("u_resolution"),this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform2f(this.shader.getUniformLocation("u_camera"),e,t),this.gl.uniform1f(this.shader.getUniformLocation("u_zoom"),s),this.spriteCount=0,this.currentTexture=null}draw(e,t,s,i,o,r=0,a=0,c=1,h=1,u=[1,1,1,1],d=0,v=0,f=0){this.currentTexture!==e&&(this.flush(),this.currentTexture=e),this.spriteCount>=Qe&&this.flush();const p=this.spriteCount*pe*se;let m=-v,w=-f,y=i-v,L=-f,B=i-v,_=o-f,k=-v,E=o-f;if(d!==0){const G=Math.cos(d),$=Math.sin(d),Te=m*G-w*$,Ae=m*$+w*G,_e=y*G-L*$,vt=y*$+L*G,yt=B*G-_*$,xt=B*$+_*G,wt=k*G-E*$,bt=k*$+E*G;m=Te,w=Ae,y=_e,L=vt,B=yt,_=xt,k=wt,E=bt}m+=t,w+=s,y+=t,L+=s,B+=t,_+=s,k+=t,E+=s;const[C,I,Y,q]=u;this.setVertex(p+0,m,w,r,a,C,I,Y,q),this.setVertex(p+8,y,L,c,a,C,I,Y,q),this.setVertex(p+16,B,_,c,h,C,I,Y,q),this.setVertex(p+24,m,w,r,a,C,I,Y,q),this.setVertex(p+32,B,_,c,h,C,I,Y,q),this.setVertex(p+40,k,E,r,h,C,I,Y,q),this.spriteCount++}setVertex(e,t,s,i,o,r,a,c,h){this.vertexData[e]=t,this.vertexData[e+1]=s,this.vertexData[e+2]=i,this.vertexData[e+3]=o,this.vertexData[e+4]=r,this.vertexData[e+5]=a,this.vertexData[e+6]=c,this.vertexData[e+7]=h}flush(){if(this.spriteCount===0||!this.currentTexture)return;this.gl.bindVertexArray(this.vao),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vertexBuffer);const e=this.spriteCount*pe*se;this.gl.bufferSubData(this.gl.ARRAY_BUFFER,0,this.vertexData.subarray(0,e)),this.currentTexture.bind(0),this.gl.uniform1i(this.shader.getUniformLocation("u_texture"),0),this.gl.drawArrays(this.gl.TRIANGLES,0,this.spriteCount*pe),this.spriteCount=0,this.gl.bindVertexArray(null)}}const ie=32;class et{constructor(e){l(this,"gl");l(this,"shader");l(this,"vao");l(this,"vertexBuffer");l(this,"vertexCount",0);l(this,"mapWidth",0);l(this,"mapHeight",0);this.gl=e;const t=`#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;
        in float a_objectId;
        in vec2 a_localPos; // 0.0 to 1.0 relative to tile
        
        uniform vec2 u_resolution;
        uniform vec2 u_camera;
        uniform float u_zoom;
        uniform highp float u_time; // Explicit highp
        
        // Shockwave uniforms
        uniform vec2 u_shockwaveCenter; // World coordinates
        uniform float u_shockwaveTime;  // Time since explosion start (seconds)
        uniform vec3 u_shockwaveParams; // x: amplitude, y: frequency, z: speed
        
        out vec2 v_texCoord;
        flat out float v_objectId;
        
        void main() {
            vec2 pos = a_position;
            
            // Portal Scaling Effect (ID: 120)
            // Center scaling logic
            if (abs(a_objectId - 120.0) < 0.5) {
                // Determine center of the tile
                // a_localPos is 0,0 for TopLeft, 1,1 for BottomRight
                // pos is the corner.
                // center = pos + (0.5 - localPos) * 32.0; (assuming 32px tiles)
                
                vec2 center = pos + (vec2(0.5) - a_localPos) * 32.0;
                
                // Pulsate scale: +/- 25% (0.75 to 1.25)
                // Speed 12.0 (3x original 4.0)
                float scale = 1.0 + 0.25 * sin(u_time * 12.0);
                
                // Apply scaling relative to center
                pos = center + (pos - center) * scale;
            }
            
            // Shockwave effect
            if (u_shockwaveTime > 0.0) {
                float dist = distance(pos, u_shockwaveCenter);
                float waveDist = u_shockwaveTime * u_shockwaveParams.z; // Speed
                
                // Calculate wave
                float diff = dist - waveDist;
                float width = 200.0; // Width of the wave ring
                
                if (abs(diff) < width) {
                    // Create a ripple
                    float angle = diff / width * 3.14159; // -PI to PI
                    float offset = cos(angle) * u_shockwaveParams.x; // Amplitude
                    
                    // Direction vector from center
                    vec2 dir = normalize(pos - u_shockwaveCenter);
                    if (length(pos - u_shockwaveCenter) < 0.1) dir = vec2(0.0);
                    
                    pos += dir * offset;
                }
            }

            // Convert world pos to view pos
            vec2 viewPos = (pos - u_camera) * u_zoom;
            
            // Convert to clip space (-1 to 1)
            // 0,0 is top-left in screen pixels
            vec2 clipPos = (viewPos / u_resolution) * 2.0 - 1.0;
            
            // Flip Y because WebGL is bottom-left 0,0 but screen is top-left 0,0
            gl_Position = vec4(clipPos.x, -clipPos.y, 0, 1);
            
            v_texCoord = a_texCoord;
            v_objectId = a_objectId;
        }`,s=`#version 300 es
        precision mediump float;
        
        in vec2 v_texCoord;
        flat in float v_objectId;
        
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        uniform highp float u_time; // Explicit highp to match Vertex Shader
        
        out vec4 outColor;
        
        void main() {
            vec4 texColor = texture(u_texture, v_texCoord);
            
            // Skip transparent pixels (0 alpha)
            if (texColor.a < 0.1) discard;
            
            vec3 finalColor = texColor.rgb;
            
            // Normalize Alpha for output (markers like 254/255 become 1.0 for rendering)
            float finalAlpha = 1.0; 
            
            // Check Alpha Markers
            // 254/255 = 0.996078 (Red)
            // 253/255 = 0.992156 (Green)
            // Use small epsilon for float comparison.
            
            bool isRedMarker = (texColor.a > 0.994 && texColor.a < 0.998);
            bool isGreenMarker = (texColor.a > 0.990 && texColor.a < 0.994);
            
            // Effects based on Object ID
            // Red Wall: '@' (64)
            if (abs(v_objectId - 64.0) < 0.5) {
                if (isRedMarker) {
                    // Pulse Brightness
                    // Speed 9.0
                    float p = sin(u_time * 9.0) * 0.5 + 0.5; // 0 to 1
                    
                    // Increased magnitude (+20% -> 0.6)
                    float brightness = 1.0 + 0.6 * p;
                    
                    finalColor *= brightness;
                    // 33% more red
                    finalColor.r *= 1.33;
                    
                    // Reduced transparency: ~83% opacity
                    finalAlpha = 0.83; 
                }
            }
            
            // Portal: 'x' (120)
            if (abs(v_objectId - 120.0) < 0.5) {
                if (isGreenMarker) {
                    // Pulse Brightness
                    // Speed 12.0
                    float p = sin(u_time * 12.0) * 0.5 + 0.5; // 0 to 1
                    
                    // Increased magnitude
                    float brightness = 1.0 + 0.6 * p;
                    
                    finalColor *= brightness;
                    // Reduced transparency: ~83% opacity
                    finalAlpha = 0.83; 
                }
            }
            
            outColor = vec4(finalColor, finalAlpha) * u_color;
        }`;this.shader=new lt(e,t,s),this.vao=e.createVertexArray(),e.bindVertexArray(this.vao),this.vertexBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.vertexBuffer);const i=7*4,o=this.shader.getAttributeLocation("a_position");e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,i,0);const r=this.shader.getAttributeLocation("a_texCoord");e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,i,2*4);const a=this.shader.getAttributeLocation("a_objectId");e.enableVertexAttribArray(a),e.vertexAttribPointer(a,1,e.FLOAT,!1,i,4*4);const c=this.shader.getAttributeLocation("a_localPos");e.enableVertexAttribArray(c),e.vertexAttribPointer(c,2,e.FLOAT,!1,i,5*4),e.bindVertexArray(null),this.shader.use(),this.gl.uniform4f(this.shader.getUniformLocation("u_color"),1,1,1,1)}build(e,t,s){this.mapWidth=e.width,this.mapHeight=e.height;const i=new Float32Array(e.width*e.height*6*7);let o=0;const r=t.canvas.width,a=t.canvas.height;for(let c=0;c<e.height;c++)for(let h=0;h<e.width;h++){const u=c*e.width+h;if(s&&!s(u))continue;const d=e.tiles[u],v=e.objects[u],f=t.positions[d];if(!f)continue;const p=h*ie,m=c*ie,w=p+ie,y=m+ie,L=.5/r,B=.5/a,_=f.sx/r+L,k=f.sy/a+B,E=(f.sx+ie)/r-L,C=(f.sy+ie)/a-B,I=v;i[o++]=p,i[o++]=m,i[o++]=_,i[o++]=k,i[o++]=I,i[o++]=0,i[o++]=0,i[o++]=w,i[o++]=m,i[o++]=E,i[o++]=k,i[o++]=I,i[o++]=1,i[o++]=0,i[o++]=p,i[o++]=y,i[o++]=_,i[o++]=C,i[o++]=I,i[o++]=0,i[o++]=1,i[o++]=p,i[o++]=y,i[o++]=_,i[o++]=C,i[o++]=I,i[o++]=0,i[o++]=1,i[o++]=w,i[o++]=m,i[o++]=E,i[o++]=k,i[o++]=I,i[o++]=1,i[o++]=0,i[o++]=w,i[o++]=y,i[o++]=E,i[o++]=C,i[o++]=I,i[o++]=1,i[o++]=1}this.vertexCount=o/7,this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vertexBuffer),this.gl.bufferData(this.gl.ARRAY_BUFFER,i,this.gl.STATIC_DRAW)}updateTiles(e,t){this.build(e,t)}setColor(e,t,s,i){this.shader.use(),this.gl.uniform4f(this.shader.getUniformLocation("u_color"),e,t,s,i)}draw(e,t,s,i,o=0){this.shader.use(),this.gl.uniform2f(this.shader.getUniformLocation("u_resolution"),this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform2f(this.shader.getUniformLocation("u_camera"),t,s),this.gl.uniform1f(this.shader.getUniformLocation("u_zoom"),i),this.gl.uniform1f(this.shader.getUniformLocation("u_time"),o),e.bind(0),this.gl.uniform1i(this.shader.getUniformLocation("u_texture"),0),this.gl.bindVertexArray(this.vao),this.gl.drawArrays(this.gl.TRIANGLES,0,this.vertexCount),this.gl.bindVertexArray(null)}setShockwave(e,t,s=10){this.shader.use(),this.gl.uniform2f(this.shader.getUniformLocation("u_shockwaveCenter"),e.x,e.y),this.gl.uniform1f(this.shader.getUniformLocation("u_shockwaveTime"),t),this.gl.uniform3f(this.shader.getUniformLocation("u_shockwaveParams"),s,1,500)}}const Ut=new Set([119,118,63,37,113,93,40,41,91,64,120]);function tt(n){return Ut.has(n)}class ne{constructor(e){l(this,"gl");l(this,"texture");l(this,"width");l(this,"height");this.gl=e;const t=e.createTexture();if(!t)throw new Error("Failed to create texture");this.texture=t,this.width=0,this.height=0}bind(e=0){this.gl.activeTexture(this.gl.TEXTURE0+e),this.gl.bindTexture(this.gl.TEXTURE_2D,this.texture)}setImage(e){this.width=e.width,this.height=e.height,this.bind(),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,e),this.setParameters()}setData(e,t,s){this.width=e,this.height=t,this.bind(),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,e,t,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,s),this.setParameters()}setParameters(){this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.NEAREST),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.NEAREST)}dispose(){this.gl.deleteTexture(this.texture)}}const te=class te{constructor(e){l(this,"canvas");l(this,"gl");l(this,"spriteBatch");l(this,"backgroundRenderer");l(this,"foregroundRenderer");l(this,"atlasTexture",null);l(this,"shipTextures",null);l(this,"viewport",{cameraX:0,cameraY:0,zoom:4});l(this,"shockwaveActive",!1);l(this,"shockwaveStartTime",0);l(this,"shockwaveCenter",{x:0,y:0});l(this,"lastShipState",0);l(this,"lastSx",0);l(this,"lastSy",0);l(this,"currentBackgroundUrl",null);l(this,"backgroundTexture",null);l(this,"bulletTexture",null);this.canvas=e,this.gl=Pt(e),this.spriteBatch=new Ft(this.gl),this.backgroundRenderer=new et(this.gl),this.foregroundRenderer=new et(this.gl),this.gl.enable(this.gl.BLEND),this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)}clear(){this.gl.clearColor(.02,.024,.04,1),this.gl.clear(this.gl.COLOR_BUFFER_BIT)}resize(){Ct(this.canvas)&&this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}setTileAtlas(e){this.atlasTexture&&this.atlasTexture.dispose(),this.atlasTexture=new ne(this.gl),this.atlasTexture.setImage(e.canvas)}static preloadBackgroundImage(e){return te.backgroundCache.has(e)?Promise.resolve():new Promise((t,s)=>{const i=new Image;i.onload=()=>{te.backgroundCache.set(e,i),t()},i.onerror=s,i.src=e})}setBackgroundImage(e){if(this.currentBackgroundUrl===e)return Promise.resolve();this.currentBackgroundUrl=e;const t=te.backgroundCache.get(e);return t?(this.applyBackgroundTexture(t,e),Promise.resolve()):new Promise((s,i)=>{const o=new Image;o.onload=()=>{te.backgroundCache.set(e,o),this.currentBackgroundUrl===e&&this.applyBackgroundTexture(o,e),s()},o.onerror=i,o.src=e})}applyBackgroundTexture(e,t){this.currentBackgroundUrl===t&&(this.backgroundTexture&&this.backgroundTexture.dispose(),this.backgroundTexture=new ne(this.gl),this.backgroundTexture.setImage(e),this.gl.bindTexture(this.gl.TEXTURE_2D,this.backgroundTexture.texture),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.REPEAT),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.REPEAT))}drawBackground(e,t){if(!this.backgroundTexture)return;const s=.5,i=this.canvas.width/this.viewport.zoom,o=this.canvas.height/this.viewport.zoom,r=32,a=e*r,c=t*r,h=Math.max(0,a-i),u=Math.max(0,c-o),d=h*s+i,v=u*s+o;this.spriteBatch.begin(this.viewport.cameraX,this.viewport.cameraY,this.viewport.zoom);const f=this.viewport.cameraX*s,p=this.viewport.cameraY*s,m=f/d,w=p/v,y=(f+i)/d,L=(p+o)/v;this.spriteBatch.draw(this.backgroundTexture,this.viewport.cameraX,this.viewport.cameraY,i,o,m,w,y,L),this.spriteBatch.flush()}setShipSprites(e){this.shipTextures={thrust:e.thrust.map(t=>{const s=new ne(this.gl);return s.setImage(t),s}),noThrust:e.noThrust.map(t=>{const s=new ne(this.gl);return s.setImage(t),s}),specials:{}};for(const[t,s]of Object.entries(e.specials)){const i=new ne(this.gl);i.setImage(s),this.shipTextures.specials[Number(t)]=i}}buildLevel(e,t){this.backgroundRenderer.build(e,t,s=>!tt(e.objects[s])),this.foregroundRenderer.build(e,t,s=>tt(e.objects[s]))}updateLevel(e,t){this.buildLevel(e,t)}drawWorld(e,t,s,i){if(!this.atlasTexture)return;if(this.gl.enable(this.gl.BLEND),this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA),this.gl.disable(this.gl.DEPTH_TEST),t){const y=this.calculateOptimalZoom(e.width,e.height),B="ontouchstart"in window||navigator.maxTouchPoints>0||window.innerWidth<768?2:4;if(this.viewport.zoom=Math.max(B,y),this.clampCamera(e.width,e.height,t.sx,t.sy),t.shipState===2&&this.lastShipState!==2){this.shockwaveActive=!0,this.shockwaveStartTime=performance.now()/1e3;const _=t.sx-this.lastSx,k=t.sy-this.lastSy,E=Math.sqrt(_*_+k*k);let C=0,I=0;E>0&&(C=_/E*16,I=k/E*16),this.shockwaveCenter={x:t.sx+16+C,y:t.sy+16+I}}else t.shipState===3&&this.shockwaveActive&&(this.shockwaveActive=!1,this.backgroundRenderer.setShockwave({x:0,y:0},0),this.foregroundRenderer.setShockwave({x:0,y:0},0));this.lastShipState=t.shipState,this.lastSx=t.sx,this.lastSy=t.sy}if(this.shockwaveActive){const y=performance.now()/1e3-this.shockwaveStartTime;y>2?(this.shockwaveActive=!1,this.backgroundRenderer.setShockwave({x:0,y:0},0),this.foregroundRenderer.setShockwave({x:0,y:0},0)):(this.backgroundRenderer.setShockwave(this.shockwaveCenter,y),this.foregroundRenderer.setShockwave(this.shockwaveCenter,y))}this.gl.clearColor(.02,.024,.04,1),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.drawBackground(e.width,e.height);const o=32,r=e.width*o/2,a=e.height*o/2,c=this.viewport.cameraX+this.canvas.width/this.viewport.zoom/2,h=this.viewport.cameraY+this.canvas.height/this.viewport.zoom/2,u=c-r,d=h-a,v=.015,f=u*v,p=d*v,m=.5,w=performance.now()/1e3;if(this.backgroundRenderer.setColor(0,0,0,m),this.backgroundRenderer.draw(this.atlasTexture,this.viewport.cameraX-f,this.viewport.cameraY-p,this.viewport.zoom,w),t&&s&&i&&s.state!==2){const y=f,L=p;this.drawShip(t,s,i,y,L,[0,0,0,m])}this.backgroundRenderer.setColor(1,1,1,1),this.backgroundRenderer.draw(this.atlasTexture,this.viewport.cameraX,this.viewport.cameraY,this.viewport.zoom,w)}drawWorldBackground(e){this.drawWorld(e,null)}drawWorldForeground(){this.atlasTexture&&this.foregroundRenderer.draw(this.atlasTexture,this.viewport.cameraX,this.viewport.cameraY,this.viewport.zoom,performance.now()/1e3)}calculateOptimalZoom(e,t){const i=e*32,o=t*32,r=this.canvas.width/i,a=this.canvas.height/o;return Math.max(r,a)}clampCamera(e,t,s,i){const r=this.canvas.width/this.viewport.zoom,a=this.canvas.height/this.viewport.zoom,c=e*32,h=t*32;let u=s-r/2,d=i-a/2;u=Math.max(0,Math.min(u,c-r)),d=Math.max(0,Math.min(d,h-a)),r>=c&&(u=(c-r)/2),a>=h&&(d=(h-a)/2),this.viewport.cameraX=u,this.viewport.cameraY=d}drawShip(e,t,s,i=0,o=0,r=[1,1,1,1]){this.spriteBatch.begin(this.viewport.cameraX,this.viewport.cameraY,this.viewport.zoom);const a=t.image??0,c=e.sx+i,h=e.sy+o;if(a===0||a===1){if(this.shipTextures){const u=(e.sa??0)>>>9&31,v=(a===1?this.shipTextures.thrust:this.shipTextures.noThrust)[u];v&&this.spriteBatch.draw(v,c,h,fe,fe,0,0,1,1,r)}}else{const u=s[a];if(u!==void 0&&this.shipTextures){const d=this.shipTextures.specials[u];d&&this.spriteBatch.draw(d,c,h,fe,fe,0,0,1,1,r)}}this.spriteBatch.flush()}drawBullets(e){if(!this.bulletTexture){this.bulletTexture=new ne(this.gl);const t=16,s=document.createElement("canvas");s.width=t,s.height=t;const i=s.getContext("2d"),o=i.createRadialGradient(t/2,t/2,0,t/2,t/2,t/2);o.addColorStop(0,"rgba(255, 255, 255, 1)"),o.addColorStop(.4,"rgba(200, 240, 255, 0.8)"),o.addColorStop(1,"rgba(0, 100, 255, 0)"),i.fillStyle=o,i.fillRect(0,0,t,t),this.bulletTexture.setImage(s)}if(this.bulletTexture){this.spriteBatch.begin(this.viewport.cameraX,this.viewport.cameraY,this.viewport.zoom);for(const s of e)this.spriteBatch.draw(this.bulletTexture,s.x-6/2,s.y-6/2,6,6,0,0,1,1,[1,1,1,1]);this.spriteBatch.flush()}}drawActions(e,t){if(this.atlasTexture){this.spriteBatch.begin(this.viewport.cameraX,this.viewport.cameraY,this.viewport.zoom);for(const s of e){if(!s.active)continue;const i=s.frame;if(i===51||i===117)continue;const o=t.positions[i];if(o){const r=t.canvas.width,a=t.canvas.height,c=o.sx/r,h=o.sy/a,u=(o.sx+32)/r,d=(o.sy+32)/a,v=32,f=v/2;this.spriteBatch.draw(this.atlasTexture,s.x-f,s.y-f,v,v,c,h,u,d,[1,1,1,1])}}this.spriteBatch.flush()}}};l(te,"backgroundCache",new Map);let Ue=te;function Bt(n,e){const{width:t}=n.canvas,s=20,i=30;n.save(),n.font=`${i}px 'Galactic', monospace`,n.textBaseline="top",n.fillStyle="#ffffff",n.shadowColor="#000000",n.shadowBlur=4,n.shadowOffsetX=2,n.shadowOffsetY=2;const o=s,r=s+n.measureText("Score: ").width;n.textAlign="left",n.fillText("Level:",o,s),n.fillText(`${e.levelnum}`,r,s),n.fillText("Score:",o,s+i*1.5),n.fillText(`${e.shipScore}`,r,s+i*1.5);const c=t<768?i*2.5:i*3.5,{height:h}=n.canvas,u=Math.floor(e.shipTime).toFixed(0);n.textAlign="right",n.fillText("Time: ",t/2,h-s-c),n.textAlign="left",n.fillText(u,t/2,h-s-c);const d=n.measureText("9999").width,v=t-s,f=n.measureText("Lives:").width,p=v-d-10-f;e.shipFuel<500?n.fillStyle="#ff0000":n.fillStyle="#ffffff",n.textAlign="left",n.fillText("Fuel:",p,s),n.textAlign="right",n.fillText(`${e.shipFuel}`,v,s),n.fillStyle="#ffffff",n.textAlign="left",n.fillText("Lives:",p,s+i*1.5),n.textAlign="right",n.fillText(`${e.shipLife}`,v,s+i*1.5),n.restore()}class Mt{constructor(){l(this,"x",0);l(this,"y",0);l(this,"radius",50);l(this,"knobRadius",20);l(this,"dragX",0);l(this,"dragY",0);l(this,"active",!1);l(this,"touchId",null);l(this,"angle",0);l(this,"magnitude",0);l(this,"currentAngle",-Math.PI/2);l(this,"targetAngle",-Math.PI/2);l(this,"SMOOTHING",.15)}setPosition(e,t,s){this.x=e,this.y=t,this.radius=s,this.knobRadius=s/4,this.updateKnobPosition()}handleTouchStart(e,t,s){const i=e-this.x,o=t-this.y;return Math.sqrt(i*i+o*o)<=this.radius*1.5?(this.active=!0,this.touchId=s,this.updateTarget(i,o),!0):!1}handleTouchMove(e,t,s){if(!this.active||this.touchId!==s)return;const i=e-this.x,o=t-this.y;this.updateTarget(i,o)}handleTouchEnd(e){this.active&&this.touchId===e&&(this.active=!1,this.touchId=null)}updateTarget(e,t){this.targetAngle=Math.atan2(t,e)}updateKnobPosition(){this.dragX=Math.cos(this.currentAngle)*this.radius,this.dragY=Math.sin(this.currentAngle)*this.radius}lerpAngle(e,t,s){let i=t-e;for(;i>Math.PI;)i-=Math.PI*2;for(;i<-Math.PI;)i+=Math.PI*2;return e+i*s}update(){for(this.active&&(this.currentAngle=this.lerpAngle(this.currentAngle,this.targetAngle,this.SMOOTHING));this.currentAngle>Math.PI;)this.currentAngle-=Math.PI*2;for(;this.currentAngle<-Math.PI;)this.currentAngle+=Math.PI*2;this.angle=this.currentAngle,this.updateKnobPosition(),this.magnitude=1}render(e){this.update(),e.beginPath(),e.arc(this.x,this.y,this.radius,0,Math.PI*2),e.strokeStyle="rgba(255, 255, 255, 0.3)",e.lineWidth=4,e.stroke();const t=this.x+this.dragX,s=this.y+this.dragY;e.beginPath(),e.arc(t,s,this.knobRadius,0,Math.PI*2),e.fillStyle=this.active?"rgba(255, 255, 255, 0.9)":"rgba(255, 255, 255, 0.6)",e.fill(),e.beginPath(),e.moveTo(this.x,this.y),e.lineTo(t,s),e.strokeStyle="rgba(255, 255, 255, 0.2)",e.lineWidth=2,e.stroke()}}class ct{constructor(e=""){l(this,"x",0);l(this,"y",0);l(this,"radius",40);l(this,"active",!1);l(this,"touchId",null);l(this,"label","");this.label=e}setPosition(e,t,s){this.x=e,this.y=t,this.radius=s}handleTouchStart(e,t,s){const i=e-this.x,o=t-this.y;return Math.sqrt(i*i+o*o)<=this.radius?(this.active=!0,this.touchId=s,!0):!1}handleTouchEnd(e){this.active&&this.touchId===e&&(this.active=!1,this.touchId=null)}render(e){e.beginPath(),e.arc(this.x,this.y,this.radius,0,Math.PI*2),e.fillStyle=this.active?"rgba(255, 255, 255, 0.5)":"rgba(255, 255, 255, 0.2)",e.fill(),e.strokeStyle="rgba(255, 255, 255, 0.5)",e.lineWidth=2,e.stroke(),this.label&&(e.fillStyle="#fff",e.font='20px "Galactic", monospace',e.textAlign="center",e.textBaseline="middle",e.fillText(this.label,this.x,this.y))}}const Dt="native/gravitywars.json",Ot="native/gravitywars.js",$t="native/gravitywars.wasm",Nt="native/gravitywars.data";async function Vt(n={}){const e=n.manifestUrl??Dt,t=n.loaderUrl??Ot,s=n.wasmUrl??$t,i=n.dataUrl??Nt,o=await fetch(e);if(!o.ok)throw new Error(`GravityWars wasm manifest missing (${e}). Run ./tools/build-wasm.sh first.`);const r=await o.json(),a=n.factoryOverride??(await import(new URL(t,window.location.href).toString())).default;if(typeof a!="function")throw new Error(`GravityWars loader at ${t} is invalid. Expected default export factory.`);return{runtime:await a({locateFile:h=>h.endsWith(".wasm")?s:h.endsWith(".data")?i:h}),manifest:r}}function zt(n){const t=Ht(n,"get_ship_state")(),s=n.HEAPU8,i=new DataView(s.buffer);return{read(){const o=i.getInt32(t,!0),r=i.getInt32(t+4,!0),a=i.getInt32(t+8,!0),c=i.getInt32(t+16,!0),h=i.getInt32(t+20,!0),u=i.getInt32(t+24,!0),d=i.getInt32(t+28,!0);return{active:o,x:r,y:a,thrust:c,image:h,state:u,animationPhase:d}}}}function Ht(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}const Gt=60;function Wt(n){const e=Xt(n,"get_global_state");return{read(){const t=e(),s=new DataView(n.HEAPU8.buffer,t,Gt);return{shipState:s.getInt32(0,!0),shipActive:s.getInt32(4,!0),shipThrust:s.getInt32(8,!0),sx:s.getInt32(12,!0),sy:s.getInt32(16,!0),shipFuel:s.getInt32(20,!0),shipTime:s.getFloat32(24,!0),shipLife:s.getInt32(28,!0),shipScore:s.getInt32(32,!0),numKeys:s.getInt32(36,!0),levelnum:s.getInt32(40,!0),sa:s.getInt32(44,!0),dynamicBlocksChanged:s.getInt32(48,!0),gameOver:s.getInt32(52,!0)}}}}function Xt(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}const ht=20,ut=45,st=ht*ut;function dt(n){const e=it(n,"get_objects_buffer"),t=it(n,"get_level_buffer"),s=e(),i=t(),o=new Uint8Array(n.HEAPU8.buffer,s,st),r=new Uint8Array(n.HEAPU8.buffer,i,st);return{width:ht,height:ut,objects:o,tiles:r}}function it(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}const Yt=12,qt=32,jt=0,Kt=4,Zt=28,nt=10;function Jt(n){const t=Qt(n,"get_bullets_buffer")(),s=new DataView(n.HEAPU8.buffer);return{read(){const i=[];for(let o=0;o<Yt;o++){const r=t+o*qt,a=!!s.getUint8(r+Zt),c=s.getInt32(r+jt,!0),h=s.getInt32(r+Kt,!0);i.push({id:o,x:c>>nt,y:h>>nt,active:a})}return i}}}function Qt(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}const es=12,ts=18,ss=0,is=2,ns=8,os=10,rs=16,as=4,ls=6;function cs(n){const t=hs(n,"get_action_buffer")(),s=new DataView(n.HEAPU8.buffer);return{read(){const i=[];for(let o=0;o<es;o++){const r=t+o*ts,a=s.getInt16(r+ns,!0),c=s.getInt16(r+os,!0);c&&i.push({id:o,x:s.getInt16(r+ss,!0),y:s.getInt16(r+is,!0),frame:a,start:s.getInt16(r+as,!0),stop:s.getInt16(r+ls,!0),type:s.getInt16(r+rs,!0),active:!!c})}return i}}}function hs(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}const us="modulepreload",ds=function(n,e){return new URL(n,e).href},ot={},fs=function(e,t,s){let i=Promise.resolve();if(t&&t.length>0){const r=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),c=(a==null?void 0:a.nonce)||(a==null?void 0:a.getAttribute("nonce"));i=Promise.allSettled(t.map(h=>{if(h=ds(h,s),h in ot)return;ot[h]=!0;const u=h.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(!!s)for(let p=r.length-1;p>=0;p--){const m=r[p];if(m.href===h&&(!u||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${h}"]${d}`))return;const f=document.createElement("link");if(f.rel=u?"stylesheet":us,u||(f.as="script"),f.crossOrigin="",f.href=h,c&&f.setAttribute("nonce",c),document.head.appendChild(f),u)return new Promise((p,m)=>{f.addEventListener("load",p),f.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${h}`)))})}))}function o(r){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=r,window.dispatchEvent(a),!a.defaultPrevented)throw r}return i.then(r=>{for(const a of r||[])a.status==="rejected"&&o(a.reason);return e().catch(o)})},me={ArrowUp:"thrust",ArrowLeft:"rotate-left",ArrowRight:"rotate-right",Space:"fire",Equal:"next-level","+":"next-level",Minus:"prev-level","-":"prev-level",Digit0:"toggle-debug",0:"toggle-debug",KeyD:"toggle-cheat",d:"toggle-cheat"};async function ps(n,e,t,s){const i={thrust:0,fire:!1,rotate:0,nextLevel:!1,prevLevel:!1,toggleDebug:!1,toggleCheat:!1},o=c=>{const h=document.getElementById("debug-log");h&&(h.innerText=`Key: ${c.code}`);const u=me[c.code]??me[c.key];if(u){switch(u){case"thrust":i.thrust=1;break;case"fire":i.fire=!0;break;case"rotate-left":i.rotate=-1;break;case"rotate-right":i.rotate=1;break;case"next-level":i.nextLevel=!0;break;case"prev-level":i.prevLevel=!0;break;case"toggle-debug":i.toggleDebug=!i.toggleDebug;break;case"toggle-cheat":i.toggleCheat=!0;break}c.preventDefault()}},r=c=>{const h=me[c.code]??me[c.key];if(h){switch(h){case"thrust":i.thrust=0;break;case"fire":i.fire=!1;break;case"rotate-left":i.rotate===-1&&(i.rotate=0);break;case"rotate-right":i.rotate===1&&(i.rotate=0);break;case"next-level":i.nextLevel=!1;break;case"prev-level":i.prevLevel=!1;break}c.preventDefault()}};document.addEventListener("keydown",o),document.addEventListener("keyup",r);let a=null;if(n){const{createTouchInput:c}=await fs(async()=>{const{createTouchInput:u}=await import("./touchInput-CmpxGkwN.js");return{createTouchInput:u}},[],import.meta.url);a=c(n,i,e,t,s).dispose}return{state:i,dispose(){document.removeEventListener("keydown",o),document.removeEventListener("keyup",r),a==null||a()}}}class ms{constructor(e){l(this,"onTick");l(this,"lastTime",performance.now());l(this,"step",e=>{const t=e-this.lastTime;this.lastTime=e,this.onTick({deltaMs:t}),requestAnimationFrame(this.step)});this.onTick=e}start(){requestAnimationFrame(this.step)}}class gs{constructor(e,t){l(this,"onPlay");l(this,"element");l(this,"levelSelector");l(this,"selectedLevel",1);l(this,"totalLevels",60);l(this,"focusIndex",0);l(this,"SHIP_BLUE","#2e9afe");this.onPlay=t,this.element=document.createElement("div"),this.element.className="ui-screen hidden",this.element.style.position="absolute",this.element.style.top="0",this.element.style.left="0",this.element.style.width="100%",this.element.style.height="100%",this.element.style.display="flex",this.element.style.flexDirection="column",this.element.style.alignItems="center",this.element.style.justifyContent="center",this.element.style.background="rgba(0, 0, 0, 0.6)",this.element.style.color="#fff",this.element.style.zIndex="10",this.element.style.backdropFilter="blur(2px)",this.element.innerHTML=`
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
                <div class="title-container" style="text-align: center; margin-bottom: 40px;">
                    <h1 class="galactic-text" style="font-size: 64px; margin: 0; color: ${this.SHIP_BLUE}; text-shadow: 0 0 20px rgba(46, 154, 254, 0.5);">GRAVITY WARS</h1>
                    <h2 style="font-size: 18px; color: #888; font-weight: normal; margin-top: 10px;">- THE BEGINNING -</h2>
                </div>
                
                <div class="level-section" style="text-align: center; margin-bottom: 30px;">
                    <div class="level-label" style="font-size: 14px; color: #aaa; margin-bottom: 15px; letter-spacing: 2px;">SELECT STARTING LEVEL</div>
                    <div class="level-selector-wrapper" style="width: 300px; overflow: hidden; position: relative; padding: 10px 0;">
                        <div class="level-selector" id="level-selector" style="display: flex; gap: 20px; transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); padding-left: 130px;">
                            <!-- Levels injected here -->
                        </div>
                        <div class="selector-highlight" style="
                            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); 
                            width: 50px; height: 50px; 
                            border: 2px solid ${this.SHIP_BLUE}; 
                            border-radius: 8px; 
                            box-shadow: 0 0 15px rgba(46, 154, 254, 0.3); 
                            pointer-events: none;
                            transition: all 0.2s;
                        "></div>
                    </div>
                </div>

                <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 240px;">
                    <button id="btn-play" style="
                        background: rgba(46, 154, 254, 0.1); 
                        border: 1px solid ${this.SHIP_BLUE}; 
                        color: ${this.SHIP_BLUE}; 
                        padding: 15px; 
                        font-family: inherit; 
                        font-size: 18px; 
                        cursor: pointer; 
                        transition: all 0.2s; 
                        border-radius: 4px;
                        outline: none;
                    ">PLAY</button>
                    <div style="display: flex; gap: 15px;">
                         <button id="btn-credits" style="
                            flex: 1; 
                            background: rgba(255, 255, 255, 0.05); 
                            border: 1px solid rgba(46, 154, 254, 0.5); 
                            color: #aaa; 
                            padding: 10px; 
                            cursor: pointer; 
                            font-family: inherit; 
                            border-radius: 4px;
                            outline: none;
                            transition: all 0.2s;
                        ">CREDITS</button>
                    </div>
                </div>
            </div>

            <div class="desktop-controls-hint" style="
                margin-bottom: 30px; 
                font-size: 13px; 
                color: #666; 
                text-align: center; 
                line-height: 1.6; 
                font-family: monospace; 
                letter-spacing: 1px;
            ">
                <div style="margin-bottom: 4px;">STEER WITH <span style="color: ${this.SHIP_BLUE};">ARROW KEYS</span></div>
                <div>FIRE WITH <span style="color: ${this.SHIP_BLUE};">SPACE BAR</span></div>
            </div>

            <div id="credits-modal" class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); flex-direction: column; align-items: center; justify-content: center; z-index: 20; display: none;">
                <h2 class="galactic-text" style="color: ${this.SHIP_BLUE}; margin-bottom: 30px;">CREDITS</h2>
                <div style="text-align: center; line-height: 2; color: #ccc;">
                    <p><span style="color: #888;">Game development:</span> <strong>Sami Niemi</strong> <span style="color: ${this.SHIP_BLUE};">@smniemi</span></p>
                    <p><span style="color: #888;">Game graphics:</span> <strong>Pär Johannesson</strong></p>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                        <p style="margin: 8px 0;"><span style="color: ${this.SHIP_BLUE};">1995</span> <span style="color: #666;">—</span> Linux</p>
                        <p style="margin: 8px 0;"><span style="color: ${this.SHIP_BLUE};">2019</span> <span style="color: #666;">—</span> iPhone</p>
                        <p style="margin: 8px 0;"><span style="color: ${this.SHIP_BLUE};">2025</span> <span style="color: #666;">—</span> Web</p>
                    </div>
                </div>
                <button id="btn-close-credits" style="margin-top: 40px; background: none; border: 1px solid #666; color: #fff; padding: 8px 30px; cursor: pointer;">BACK</button>
            </div>
        `,e.appendChild(this.element),this.levelSelector=this.element.querySelector("#level-selector"),this.renderLevels(),this.setupInput(),this.setupButtons(),this.updateFocusVisuals();const s=this.element.querySelector("#btn-play");s.onmouseenter=()=>{this.focusIndex=1,this.updateFocusVisuals()};const i=this.element.querySelector("#btn-credits");i.onmouseenter=()=>{this.focusIndex=2,this.updateFocusVisuals()}}renderLevels(){this.levelSelector.innerHTML="";for(let e=1;e<=this.totalLevels;e++){const t=document.createElement("div");t.className="level-item",t.style.minWidth="40px",t.style.textAlign="center",t.style.fontSize="24px",t.style.color="#555",t.style.cursor="pointer",t.style.transition="all 0.3s",t.textContent=e<10?`0${e}`:`${e}`,t.dataset.level=e.toString(),t.onclick=()=>{this.selectedLevel=e,this.focusIndex=0,this.updateLevelSelection(),this.updateFocusVisuals()},this.levelSelector.appendChild(t)}this.updateLevelSelection()}updateLevelSelection(){const e=Array.from(this.levelSelector.children),t=60;e.forEach(i=>{parseInt(i.dataset.level||"0")===this.selectedLevel?(i.style.color="#fff",i.style.transform="scale(1.2)",i.style.textShadow=`0 0 10px ${this.SHIP_BLUE}`):(i.style.color="#555",i.style.transform="scale(1)",i.style.textShadow="none")});const s=this.selectedLevel-1;this.levelSelector.style.transform=`translateX(${-s*t}px)`}updateFocusVisuals(){const e=this.element.querySelector(".selector-highlight"),t=this.element.querySelector("#btn-play"),s=this.element.querySelector("#btn-credits");switch(e.style.opacity="0.3",e.style.borderColor="#444",t.style.background="rgba(46, 154, 254, 0.1)",t.style.boxShadow="none",s.style.background="rgba(255, 255, 255, 0.05)",s.style.color="#aaa",this.focusIndex){case 0:e.style.opacity="1",e.style.borderColor=this.SHIP_BLUE,e.style.boxShadow="0 0 15px rgba(46, 154, 254, 0.3)";break;case 1:t.style.background="rgba(46, 154, 254, 0.3)",t.style.boxShadow="0 0 20px rgba(46, 154, 254, 0.4)";break;case 2:s.style.background="rgba(46, 154, 254, 0.2)",s.style.color="#fff";break}}setupInput(){let e=!1,t=0;const s=this.element.querySelector(".level-selector-wrapper");s.addEventListener("mousedown",i=>{e=!0,t=i.pageX,this.focusIndex=0,this.updateFocusVisuals()}),window.addEventListener("mouseup",()=>{e=!1}),window.addEventListener("mousemove",i=>{if(!e)return;const o=i.pageX,r=o-t;Math.abs(r)>40&&(r>0?this.selectPrev():this.selectNext(),t=o)}),window.addEventListener("keydown",i=>{if(this.element.style.display!=="none")switch(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(i.key)&&i.preventDefault(),i.key){case"ArrowUp":this.focusIndex=(this.focusIndex-1+3)%3,this.updateFocusVisuals();break;case"ArrowDown":this.focusIndex=(this.focusIndex+1)%3,this.updateFocusVisuals();break;case"ArrowLeft":this.focusIndex===0&&this.selectPrev();break;case"ArrowRight":this.focusIndex===0&&this.selectNext();break;case"Enter":case" ":this.triggerSelection();break}}),s.addEventListener("touchstart",i=>{t=i.touches[0].pageX,this.focusIndex=0,this.updateFocusVisuals()},{passive:!0}),s.addEventListener("touchmove",i=>{const o=i.touches[0].pageX,r=o-t;Math.abs(r)>40&&(r>0?this.selectPrev():this.selectNext(),t=o)},{passive:!0})}triggerSelection(){if(this.focusIndex===0||this.focusIndex===1)this.onPlay(this.selectedLevel);else if(this.focusIndex===2){const e=this.element.querySelector("#credits-modal");e.style.display="flex",setTimeout(()=>e.style.opacity="1",10)}}selectNext(){this.selectedLevel<this.totalLevels&&(this.selectedLevel++,this.updateLevelSelection())}selectPrev(){this.selectedLevel>1&&(this.selectedLevel--,this.updateLevelSelection())}setupButtons(){var t,s,i;(t=this.element.querySelector("#btn-play"))==null||t.addEventListener("click",()=>{this.onPlay(this.selectedLevel)});const e=this.element.querySelector("#credits-modal");(s=this.element.querySelector("#btn-credits"))==null||s.addEventListener("click",()=>{e.style.display="flex",setTimeout(()=>e.style.opacity="1",10)}),(i=this.element.querySelector("#btn-close-credits"))==null||i.addEventListener("click",()=>{e.style.display="none"})}show(){this.element.style.display="flex",this.updateLevelSelection(),this.focusIndex=0,this.updateFocusVisuals()}hide(){this.element.style.display="none"}}class vs{constructor(e,t,s){l(this,"onReplay");l(this,"onMenu");l(this,"element");l(this,"focusIndex",0);l(this,"SHIP_BLUE","#2e9afe");l(this,"handleKey",e=>{if(this.element.style.display!=="none")switch(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(e.key)&&e.preventDefault(),e.key){case"ArrowUp":case"ArrowDown":this.focusIndex=this.focusIndex===0?1:0,this.updateFocusVisuals();break;case"Enter":case" ":this.focusIndex===0?(this.onReplay(),this.hide()):(this.onMenu(),this.hide());break}});this.onReplay=t,this.onMenu=s,this.element=document.createElement("div"),this.element.className="ui-screen hidden",this.element.style.position="absolute",this.element.style.top="0",this.element.style.left="0",this.element.style.width="100%",this.element.style.height="100%",this.element.style.display="none",this.element.style.flexDirection="column",this.element.style.alignItems="center",this.element.style.justifyContent="center",this.element.style.background="rgba(0, 0, 0, 0.85)",this.element.style.color="#fff",this.element.style.zIndex="50",this.element.style.backdropFilter="blur(4px)",this.element.innerHTML=`
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 id="go-level-name" class="galactic-text" style="font-size: 32px; margin: 0; color: ${this.SHIP_BLUE}; text-shadow: 0 0 10px rgba(46, 154, 254, 0.5); letter-spacing: 2px;">LEVEL NAME</h1>
                <div style="height: 30px;"></div>
                <h2 style="font-size: 24px; color: #ff4444; font-weight: normal; margin: 10px 0; text-transform: uppercase;">You're out of lives</h2>
                <div style="font-size: 18px; color: #fff; margin-top: 20px;">SCORE: <span id="go-score" style="color: #ff0;">0</span></div>
            </div>

            <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 220px;">
                <button id="btn-replay" style="
                    background: rgba(46, 154, 254, 0.1); 
                    border: 1px solid ${this.SHIP_BLUE}; 
                    color: ${this.SHIP_BLUE}; 
                    padding: 12px; 
                    font-family: inherit; 
                    font-size: 16px; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    border-radius: 4px; 
                    text-transform: uppercase;
                    outline: none;
                ">Replay</button>
                <button id="btn-menu" style="
                    background: rgba(255, 255, 255, 0.05); 
                    border: 1px solid rgba(46, 154, 254, 0.5); 
                    color: #aaa; 
                    padding: 12px; 
                    cursor: pointer; 
                    font-family: inherit; 
                    font-size: 16px; 
                    border-radius: 4px; 
                    text-transform: uppercase;
                    outline: none;
                    transition: all 0.2s;
                ">Go to Menu</button>
            </div>
            
            <div style="margin-top: 30px; font-size: 12px; color: #555; font-family: monospace;">
                USE ARROW KEYS & ENTER
            </div>
        `,e.appendChild(this.element),this.setupButtons()}setupButtons(){const e=this.element.querySelector("#btn-replay"),t=this.element.querySelector("#btn-menu");e.addEventListener("click",()=>{this.onReplay(),this.hide()}),t.addEventListener("click",()=>{this.onMenu(),this.hide()}),e.onmouseenter=()=>{this.focusIndex=0,this.updateFocusVisuals()},t.onmouseenter=()=>{this.focusIndex=1,this.updateFocusVisuals()}}updateFocusVisuals(){const e=this.element.querySelector("#btn-replay"),t=this.element.querySelector("#btn-menu");e.style.background="rgba(46, 154, 254, 0.1)",e.style.boxShadow="none",t.style.background="rgba(255, 255, 255, 0.05)",t.style.color="#aaa",this.focusIndex===0?(e.style.background="rgba(46, 154, 254, 0.3)",e.style.boxShadow="0 0 15px rgba(46, 154, 254, 0.4)"):(t.style.background="rgba(46, 154, 254, 0.2)",t.style.color="#fff")}show(e,t){if(this.element.style.display==="flex")return;const s=this.element.querySelector("#go-level-name");s&&(s.textContent=e||"UNKNOWN SECTOR");const i=this.element.querySelector("#go-score");i&&(i.textContent=t.toString()),this.element.style.display="flex",this.element.style.opacity="0",this.focusIndex=0,this.updateFocusVisuals(),window.addEventListener("keydown",this.handleKey),requestAnimationFrame(()=>{this.element.style.transition="opacity 0.5s ease-in-out",this.element.style.opacity="1"})}hide(){window.removeEventListener("keydown",this.handleKey),this.element.style.display="none",this.element.style.opacity="0"}}class ft{constructor(e){l(this,"element");l(this,"nameElement");l(this,"subTextElement");l(this,"isPlaying",!1);this.element=document.createElement("div"),this.element.className="level-intro-screen",this.element.style.position="absolute",this.element.style.top="0",this.element.style.left="0",this.element.style.width="100%",this.element.style.height="100%",this.element.style.display="none",this.element.style.flexDirection="column",this.element.style.alignItems="center",this.element.style.justifyContent="center",this.element.style.pointerEvents="none",this.element.style.zIndex="100";const t=document.createElement("div");t.style.textAlign="center",this.nameElement=document.createElement("h1"),this.nameElement.className="galactic-text",this.nameElement.style.fontSize="48px",this.nameElement.style.color="#0ff",this.nameElement.style.textShadow="0 0 20px rgba(0, 255, 255, 0.8)",this.nameElement.style.margin="0",this.nameElement.style.letterSpacing="4px",this.nameElement.style.textTransform="uppercase",this.subTextElement=document.createElement("div"),this.subTextElement.textContent="MISSION START",this.subTextElement.style.fontSize="14px",this.subTextElement.style.color="rgba(255, 255, 255, 0.7)",this.subTextElement.style.marginTop="10px",this.subTextElement.style.letterSpacing="8px",this.subTextElement.style.fontFamily="monospace",t.appendChild(this.nameElement),t.appendChild(this.subTextElement),this.element.appendChild(t),e.appendChild(this.element)}show(e,t){this.isPlaying||(this.isPlaying=!0,this.nameElement.textContent=e||"UNKNOWN SECTOR",this.subTextElement.textContent="MISSION START",this.nameElement.style.color="#0ff",this.nameElement.style.textShadow="0 0 20px rgba(0, 255, 255, 0.8)",this.element.style.display="flex",this.element.style.opacity="0",this.element.style.transform="scale(0.9)",this.element.style.transition="opacity 0.5s ease-out, transform 2.5s ease-out",this.element.offsetWidth,requestAnimationFrame(()=>{this.element.style.opacity="1",this.element.style.transform="scale(1.05)"}),setTimeout(()=>{this.element.style.opacity="0"},2e3),setTimeout(()=>{this.element.style.display="none",this.isPlaying=!1,t()},2500))}showMessage(e,t="",s){this.isPlaying||(this.isPlaying=!0,this.nameElement.textContent=e,this.subTextElement.textContent=t,this.nameElement.style.color="#0f0",this.nameElement.style.textShadow="0 0 20px rgba(0, 255, 0, 0.8)",this.element.style.display="flex",this.element.style.opacity="0",this.element.style.transform="scale(0.9)",this.element.style.transition="opacity 0.5s ease-out, transform 2.5s ease-out",this.element.offsetWidth,requestAnimationFrame(()=>{this.element.style.opacity="1",this.element.style.transform="scale(1.05)"}),setTimeout(()=>{this.element.style.opacity="0"},2e3),setTimeout(()=>{this.element.style.display="none",this.isPlaying=!1,s==null||s()},2500))}}class ys{constructor(e,t,s){l(this,"onReplay");l(this,"onMenu");l(this,"element");l(this,"isVisible",!1);l(this,"focusIndex",0);l(this,"handleKey",e=>{if(this.isVisible)switch(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(e.key)&&e.preventDefault(),e.key){case"ArrowUp":case"ArrowDown":this.focusIndex=this.focusIndex===0?1:0,this.updateFocusVisuals();break;case"Enter":case" ":this.focusIndex===0?(this.onReplay(),this.hide()):(this.onMenu(),this.hide());break}});this.onReplay=t,this.onMenu=s,this.element=document.createElement("div"),this.element.className="ui-screen hidden",this.element.style.position="absolute",this.element.style.top="0",this.element.style.left="0",this.element.style.width="100%",this.element.style.height="100%",this.element.style.display="none",this.element.style.flexDirection="column",this.element.style.alignItems="center",this.element.style.justifyContent="center",this.element.style.background="radial-gradient(ellipse at center, rgba(0, 50, 100, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)",this.element.style.color="#fff",this.element.style.zIndex="50",this.element.style.backdropFilter="blur(8px)",this.element.style.overflow="hidden",this.element.innerHTML=`
            <style>
                @keyframes starfield {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-100%); }
                }
                @keyframes glow-pulse {
                    0%, 100% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6); }
                    50% { text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4); }
                }
                @keyframes confetti {
                    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .gc-starfield {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 200%;
                    background: radial-gradient(1px 1px at 20% 30%, white, transparent),
                                radial-gradient(1px 1px at 40% 70%, rgba(255, 255, 200, 0.8), transparent),
                                radial-gradient(1px 1px at 60% 20%, rgba(200, 220, 255, 0.9), transparent),
                                radial-gradient(1px 1px at 80% 50%, white, transparent),
                                radial-gradient(1.5px 1.5px at 10% 60%, rgba(255, 215, 0, 0.7), transparent),
                                radial-gradient(1px 1px at 90% 10%, white, transparent);
                    background-size: 200px 200px;
                    animation: starfield 20s linear infinite;
                    pointer-events: none;
                }
                .gc-confetti-particle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    animation: confetti 4s ease-in-out infinite;
                    pointer-events: none;
                }
            </style>
            <div class="gc-starfield"></div>
            <div style="text-align: center; position: relative; z-index: 10;">
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7); letter-spacing: 8px; text-transform: uppercase; margin-bottom: 10px; font-family: monospace;">Mission Complete</div>
                <h1 class="galactic-text" style="font-size: 48px; background: linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #ffd700 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 20px 0; animation: glow-pulse 2s ease-in-out infinite; filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)); letter-spacing: 4px;">
                    CONGRATULATIONS!
                </h1>
                <div style="font-size: 20px; color: #0ff; margin: 10px 0; text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);">
                    You have conquered all 13 levels!
                </div>
                <div style="font-size: 16px; color: rgba(255, 255, 255, 0.8); margin: 15px 0; max-width: 400px; line-height: 1.6;">
                    The galaxy is safe once more. Your piloting skills are legendary across the cosmos.
                </div>
                <div style="height: 20px;"></div>
                <div style="font-size: 24px; color: #fff; margin-top: 20px;">
                    FINAL SCORE: <span id="gc-score" style="color: #ffd700; font-weight: bold; text-shadow: 0 0 15px rgba(255, 215, 0, 0.7);">0</span>
                </div>
            </div>

            <div class="menu-buttons" style="display: flex; flex-direction: column; gap: 15px; width: 220px; margin-top: 40px; position: relative; z-index: 10;">
                <button id="gc-btn-replay" style="background: linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%); border: 2px solid #ffd700; color: #ffd700; padding: 14px; font-family: inherit; font-size: 16px; cursor: pointer; transition: all 0.3s; border-radius: 6px; text-transform: uppercase; letter-spacing: 2px; outline: none;">
                    Play Again
                </button>
                <button id="gc-btn-menu" style="background: rgba(255, 255, 255, 0.05); border: 1px solid #666; color: #aaa; padding: 12px; cursor: pointer; font-family: inherit; font-size: 14px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s; outline: none;">
                    Back to Menu
                </button>
            </div>
            
            <div style="margin-top: 30px; font-size: 12px; color: #555; font-family: monospace; position: relative; z-index: 10;">
                USE ARROW KEYS & ENTER
            </div>
        `,e.appendChild(this.element),this.setupButtons()}setupButtons(){const e=this.element.querySelector("#gc-btn-replay"),t=this.element.querySelector("#gc-btn-menu");e.addEventListener("click",()=>{this.onReplay(),this.hide()}),t.addEventListener("click",()=>{this.onMenu(),this.hide()}),e.onmouseenter=()=>{this.focusIndex=0,this.updateFocusVisuals()},t.onmouseenter=()=>{this.focusIndex=1,this.updateFocusVisuals()}}updateFocusVisuals(){const e=this.element.querySelector("#gc-btn-replay"),t=this.element.querySelector("#gc-btn-menu");e.style.background="linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)",e.style.boxShadow="none",e.style.transform="scale(1)",t.style.background="rgba(255, 255, 255, 0.05)",t.style.borderColor="#666",t.style.color="#aaa",this.focusIndex===0?(e.style.background="linear-gradient(180deg, rgba(255, 215, 0, 0.4) 0%, rgba(255, 140, 0, 0.4) 100%)",e.style.boxShadow="0 0 20px rgba(255, 215, 0, 0.5)",e.style.transform="scale(1.02)"):(t.style.background="rgba(255, 255, 255, 0.1)",t.style.borderColor="#aaa",t.style.color="#fff")}show(e){if(this.isVisible)return;this.isVisible=!0;const t=this.element.querySelector("#gc-score");t&&(t.textContent=e.toLocaleString()),this.element.style.display="flex",this.focusIndex=0,this.updateFocusVisuals(),window.addEventListener("keydown",this.handleKey),this.element.style.opacity="0",this.element.style.transform="scale(0.95)",requestAnimationFrame(()=>{this.element.style.transition="opacity 0.8s ease-out, transform 0.8s ease-out",this.element.style.opacity="1",this.element.style.transform="scale(1)"})}hide(){this.isVisible=!1,window.removeEventListener("keydown",this.handleKey),this.element.style.display="none",this.element.style.opacity="0",this.element.style.transform="scale(0.95)"}}class xs{constructor(e,t){l(this,"element");l(this,"isVisible",!1);l(this,"animationFrame",null);l(this,"onContinue",()=>{});l(this,"handleKey",e=>{this.isVisible&&(e.code==="Space"||e.code==="Enter"||e.key===" "||e.key==="Enter")&&this.handleInput()});this.onContinue=t,this.element=document.createElement("div"),this.element.className="level-complete-screen",this.element.style.position="absolute",this.element.style.top="0",this.element.style.left="0",this.element.style.width="100%",this.element.style.height="100%",this.element.style.display="none",this.element.style.flexDirection="column",this.element.style.alignItems="center",this.element.style.justifyContent="center",this.element.style.backgroundColor="rgba(0, 0, 0, 0.85)",this.element.style.backdropFilter="blur(5px)",this.element.style.zIndex="90",this.element.style.opacity="0",this.element.style.transition="opacity 0.3s ease-out",this.element.style.cursor="pointer",this.element.innerHTML=`
            <div class="lc-content" style="text-align: center;">
                <h2 class="galactic-text" style="color: #0af; font-size: 24px; margin: 0 0 10px 0; letter-spacing: 4px;">LEVEL COMPLETED</h2>
                <h1 id="lc-level-name" class="galactic-text" style="color: #fff; font-size: 48px; margin: 0 0 5px 0; text-shadow: 0 0 20px #0af;">LEVEL X</h1>
                <div class="galactic-text" style="color: #0f0; font-size: 32px; margin-bottom: 40px; text-shadow: 0 0 10px #0f0;">WELL DONE!</div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; max-width: 400px; margin: 0 auto; font-family: monospace; font-size: 18px; color: #ccc;">
                    <div style="text-align: right;">SCORE</div>
                    <div id="lc-base-score" style="color: #fff;">0</div>

                    <div style="text-align: right;">TIME BONUS</div>
                    <div id="lc-time-bonus" style="color: #fff;">0</div>
                    
                    <div style="text-align: right;">FUEL BONUS</div>
                    <div id="lc-fuel-bonus" style="color: #fff;">0</div>
                </div>

                <div style="margin-top: 30px; font-size: 24px; color: #fff; font-family: monospace;">
                    TOTAL SCORE: <span id="lc-score" style="color: #ff0; font-weight: bold;">0</span>
                </div>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 14px; font-family: monospace; color: #888;">
                    <div style="text-align: right;">
                        <div style="color: #0f0; font-size: 12px; margin-bottom: 2px; opacity: 0; transition: opacity 0.5s;" id="lc-new-pb-label">NEW RECORD!</div>
                        <div>PERSONAL BEST</div>
                        <div id="lc-pb" style="color: #fff; font-size: 18px; margin-top: 2px;">0</div>
                    </div>
                    <div style="text-align: left;">
                        <div style="color: #0f0; font-size: 12px; margin-bottom: 2px; opacity: 0; transition: opacity 0.5s;" id="lc-new-high-label">NEW RECORD!</div>
                        <div>HIGH SCORE</div>
                        <div id="lc-high" style="color: #fff; font-size: 18px; margin-top: 2px;">0</div>
                    </div>
                </div>

                <div style="margin-top: 50px; color: #0af; animation: pulse 1.5s infinite; font-size: 14px; letter-spacing: 2px;">
                    TAP OR PRESS FIRE TO CONTINUE
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
                @keyframes rainbow { 
                    0%{color: orange;} 	
                    10%{color: purple;} 	
                    20%{color: red;} 
                    30%{color: CadetBlue;} 
                    40%{color: yellow;} 
                    50%{color: coral;} 
                    60%{color: green;} 
                    70%{color: cyan;} 
                    80%{color: DeepPink;} 
                    90%{color: DodgerBlue;} 
                    100%{color: orange;} 
                }
                .record-pulse {
                    animation: pulse 0.5s infinite alternate;
                    color: yellow !important;
                    font-weight: bold;
                    text-shadow: 0 0 10px yellow;
                }
            </style>
        `,e.appendChild(this.element),this.element.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),console.log("[LevelComplete] Click detected"),this.handleInput()}),this.element.addEventListener("touchend",s=>{s.preventDefault(),s.stopPropagation(),console.log("[LevelComplete] Touch detected"),this.handleInput()})}setOnContinue(e){this.onContinue=e}handleInput(){console.log("[LevelComplete] handleInput called, isVisible:",this.isVisible),this.isVisible&&(console.log("[LevelComplete] Calling hide and onContinue"),this.hide(),this.onContinue())}show(e){this.isVisible=!0,this.element.style.display="flex",this.element.offsetWidth,this.element.style.opacity="1",window.addEventListener("keydown",this.handleKey);const t=this.element.querySelector("#lc-level-name");t&&(t.textContent=e.levelName);const s=Math.floor(e.time*10),i=Math.floor(e.fuel),o=s+i,r=e.currentScore+o,a=`gw_pb_level_${e.levelIndex}`,c=localStorage.getItem(a),h=c?parseInt(c,10):0,u=r>h,d=h;u&&localStorage.setItem(a,r.toString());const v=d,f=this.element.querySelector("#lc-pb"),p=this.element.querySelector("#lc-high"),m=this.element.querySelector("#lc-new-pb-label"),w=this.element.querySelector("#lc-new-high-label");f&&(f.textContent=d.toLocaleString()),p&&(p.textContent=v.toLocaleString()),m&&(m.style.opacity="0"),w&&(w.style.opacity="0"),f&&f.classList.remove("record-pulse"),p&&p.classList.remove("record-pulse");const y=this.element.querySelector("#lc-base-score"),L=this.element.querySelector("#lc-time-bonus"),B=this.element.querySelector("#lc-fuel-bonus"),_=this.element.querySelector("#lc-score");y&&(y.textContent=e.currentScore.toLocaleString()),L&&(L.textContent=`+${s}`),B&&(B.textContent=`+${i}`),_&&(_.textContent=e.currentScore.toLocaleString()),console.log("[LevelComplete] Starting animation:",{currentScore:e.currentScore,totalBonus:o,finalScore:r,previousBest:d,isNewRecord:u});const k=2e3;let E=null,C=!1;const I=q=>{if(!this.isVisible)return;E===null&&(E=q);const G=q-E,$=Math.min(G/k,1),Te=1-Math.pow(1-$,3),Ae=Math.floor(o*Te),_e=e.currentScore+Ae;_&&(_.textContent=_e.toLocaleString()),$>=1&&!C&&u&&(C=!0,this.animateRecordUpdate(d,r,f,m),this.animateRecordUpdate(v,r,p,w)),$<1||u&&!Y?this.animationFrame=requestAnimationFrame(I):u||console.log("[LevelComplete] Animation complete (No new record)")};let Y=!u;this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.animationFrame=requestAnimationFrame(I)}animateRecordUpdate(e,t,s,i){s&&setTimeout(()=>{if(!this.isVisible)return;i&&(i.style.opacity="1",i.style.animation="rainbow 0.5s infinite"),s.classList.add("record-pulse");const o=1e3,r=performance.now(),a=c=>{if(!this.isVisible)return;const h=c-r,u=Math.min(h/o,1),d=1-Math.pow(1-u,3),v=Math.floor(e+(t-e)*d);s.textContent=v.toLocaleString(),u<1?requestAnimationFrame(a):s.textContent=t.toLocaleString()};requestAnimationFrame(a)},500)}hide(){this.isVisible=!1,window.removeEventListener("keydown",this.handleKey),this.element.style.opacity="0",this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null),setTimeout(()=>{this.element.style.display="none"},300)}}function Ye(n){switch(n%7){case 0:return"back5_park.JPG";case 1:return"back_nebula.jpg";case 2:return"back_park.JPG";case 3:return"back2_park.JPG";case 4:return"back3_park.JPG";case 5:return"back4_park.JPG";case 6:return"back_park.JPG";default:return"space.jpg"}}function pt(n){return`assets/backgrounds/${Ye(n)}`}const H=document.getElementById("app")??ws();function ws(){const n=document.createElement("div");return n.id="app",document.body.appendChild(n),n}console.log("[Main] App Version: 1.0.1 (Relative Paths Configured)");const O=document.createElement("canvas");O.width=960;O.height=540;O.style.width="100%";O.style.height="100%";O.style.display="block";O.style.background="#05060a";O.tabIndex=0;O.style.outline="none";H.appendChild(O);O.focus();H.addEventListener("dblclick",()=>{document.fullscreenElement?document.exitFullscreen():H.requestFullscreen().catch(n=>{console.error(`Error attempting to enable fullscreen: ${n.message}`)})});const A=new Ue(O),U=document.createElement("canvas");U.style.position="absolute";U.style.top="0";U.style.left="0";U.style.width="100%";U.style.height="100%";U.style.pointerEvents="none";H.appendChild(U);const M=U.getContext("2d"),qe=new Mt,je=new ct("FIRE"),Ke=new ct("ACCEL"),Be="ontouchstart"in window||navigator.maxTouchPoints>0||window.innerWidth<768;function mt(){A.resize();const n=O.clientWidth,e=O.clientHeight;if(U.width!==n||U.height!==e){U.width=n,U.height=e;const t=20,s=60,i=64,r=s*2+20,a=t+s,c=e-t-s,h=c-r;je.setPosition(a,h,s),Ke.setPosition(a,c,s);const u=n-t-i,d=e-t-i;qe.setPosition(u,d,i)}}window.addEventListener("resize",mt);mt();let Me="WASM pending build…",S=null,De=null,z=null,x=null,b=null,T=null,P=null,le=null,Z=null,xe=null,we=null,Oe=null,be=[],$e=null,ge=[],oe=!1,R=null;(async()=>R=await ps(H,qe,je,Ke))();const Q=new _t;Q.setSfxVolume(.5);let N=null,ve=null,ae=null,ke=null,W=null,K=!1;const bs=13;let Ne=!1,Ve=-1,g=null;const ce={},Ss=128,X={EXPLODE_1:2,EXPLODE_2:3,EXPLODE_3:4,EXPLODE_4:5,EXPLODE_5:6,APPEAR_1:7,APPEAR_2:8,APPEAR_3:9,APPEAR_4:10,APPEAR_5:11},ze={[X.EXPLODE_1]:45,[X.EXPLODE_2]:46,[X.EXPLODE_3]:47,[X.EXPLODE_4]:48,[X.EXPLODE_5]:49,[X.APPEAR_1]:157,[X.APPEAR_2]:158,[X.APPEAR_3]:159,[X.APPEAR_4]:160,[X.APPEAR_5]:161},Ee=Array.from(new Set(Object.values(ze).filter(n=>typeof n=="number"))),Es={DISAPPEARING:4};function V(n){if(!S)throw new Error("WASM runtime not ready");if(ce[n])return ce[n];const e=S.runtime,t=[n,`_${n}`];for(const s of t){const i=e[s];if(typeof i=="function")return ce[n]=i.bind(e),ce[n]}if(typeof e.cwrap=="function"){const s=e.cwrap(n,"void",[]);return ce[n]=s,s}throw new Error(`Export ${n} not found on wasm runtime.`)}function Ts(n,e){const s=U.width/2+e.x*.015625,i=U.height/2-e.y*.015625;n.fillStyle=e.active?"#ff0":"#777",n.beginPath(),n.arc(s,i,6,0,Math.PI*2),n.fill(),n.fillStyle="#fff",n.font="12px monospace",n.fillText(`(${e.x}, ${e.y})`,s+10,i-10)}function As(n,e,t,s,i){const o=[`CHEAT MODE: ${i?"ON":"OFF"}`,`Ship state: ${e.state}`,`Pos: (${e.x}, ${e.y})`,`Thrust value: ${e.thrust}`,`Fuel: ${(t==null?void 0:t.shipFuel)??"n/a"}`,`Time: ${t?t.shipTime.toFixed(1):"n/a"}`,`Life: ${(t==null?void 0:t.shipLife)??"n/a"}`,`Score: ${(t==null?void 0:t.shipScore)??"n/a"}`,`Keys: ${(t==null?void 0:t.numKeys)??"n/a"} | Level: ${(t==null?void 0:t.levelnum)??"n/a"}`,`Angle sa: ${(t==null?void 0:t.sa)??"n/a"}`,`Input thrust: ${s.thrust}`,`Input fire: ${s.fire}`,`Input rotate: ${s.rotate}`],r=280,a=16,c=o.length*a+12,h=U.width-r-12,u=12;n.fillStyle="rgba(0, 0, 0, 0.7)",n.fillRect(h,u,r,c),n.strokeStyle="#0ff",n.strokeRect(h,u,r,c),n.fillStyle="#fff",n.font="12px monospace",o.forEach((d,v)=>{n.fillText(d,h+8,u+20+v*a)})}function _s(n){return{setThrust:he(n,"wasm_set_thrust"),setFire:he(n,"wasm_set_fire"),adjustAngle:he(n,"wasm_adjust_sa"),setSA:he(n,"wasm_set_sa"),getDemoBufferPtr:Re(n,"get_demo_buffer"),getDemoCount:Re(n,"get_demo_count"),nextLevel:re(n,"wasm_next_level"),prevLevel:re(n,"wasm_prev_level"),restartLevel:re(n,"wasm_restart_level"),toggleCheatMode:re(n,"wasm_toggle_cheat_mode"),getCheatMode:Re(n,"wasm_get_cheat_mode"),addScore:he(n,"wasm_add_score")}}function he(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return r=>o.call(t,r)}if(n.cwrap){const i=n.cwrap(e,"void",["number"]);return o=>i(o)}throw new Error(`Unable to resolve wasm export ${e}`)}function re(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"void",[]);throw new Error(`Unable to resolve wasm export ${e}`)}function Re(n,e){const t=n,s=[e,`_${e}`];for(const i of s){const o=t[i];if(typeof o=="function")return o.bind(t)}if(n.cwrap)return n.cwrap(e,"number",[]);throw new Error(`Unable to resolve wasm export ${e}`)}function gt(n,e){const t=e.runtime.HEAPU8;let s=n;for(;t[s]!==0;)s++;return new TextDecoder().decode(t.subarray(n,s)).replace(/"/g,"")}async function He(){if(!S||!g)return;if(ae||(ae=new ft(H)),Ne=!0,K=!0,x){const t=x.read().levelnum,s=pt(t);console.log(`[Main] Preloading background: ${s} for level ${t}`),await A.setBackgroundImage(s),Ge=Ye(t)}ue(),x&&(We=x.read().shipScore);const n=V("get_current_level_name"),e=gt(n(),S);ae.show(e,()=>{Ne=!1})}function Is(){var n,e;if(!(!we||oe||!z||!b)&&z.state===Es.DISAPPEARING&&z.animationPhase<=0){oe=!0;const t=b.levelnum;if(t===0){g==null||g.restartLevel(),ee=0,oe=!1;return}if(t>=bs)ke||(ke=new ys(H,()=>{if(g&&x){let s=x.read().levelnum;for(;s>1;)g.prevLevel(),s=x.read().levelnum;for(;s<1;)g.nextLevel(),s=x.read().levelnum;ue(),He(),oe=!1}},()=>{if(K=!1,Q.setSfxVolume(.5),N==null||N.show(),x){let s=x.read().levelnum;const i=V("wasm_prev_level");let o=0;for(;s>0&&o++<70;)i(),s=x.read().levelnum;Q.update(x.read(),[],T)}oe=!1})),ke.show(b.shipScore);else{if(!W||typeof W.setOnContinue!="function"){if(W){try{(n=W.hide)==null||n.call(W)}catch{}try{(e=W.element)==null||e.remove()}catch{}}W=new xs(H,()=>{})}const s=b.shipTime,i=b.shipFuel,o=Math.floor(s*10),r=Math.floor(i),a=o+r;W.setOnContinue(()=>{g&&we&&(g.addScore(a),we(),x&&(We=x.read().shipScore),He(),console.log(`[LevelComplete] Added score: ${a} (Time: ${s.toFixed(1)}*10 + Fuel: ${i})`),oe=!1)});const c=V("get_current_level_name"),h=gt(c(),S);W.show({levelName:h,time:s,fuel:i,currentScore:b.shipScore,levelIndex:b.levelnum,levelStartScore:We})}}}let Ge="",We=0,ee=0,j=null,J=0,ye=0;const Ls=new ms(({deltaMs:n})=>{if(T&&P&&!A.atlasTexture)try{A.setTileAtlas(P),A.buildLevel(T,P),console.log("[gravitywars] WebGL level built")}catch(e){console.error("Failed to build level",e)}if(!Z&&(S!=null&&S.runtime))try{Z=Se(S.runtime,Ee),A.setShipSprites(Z)}catch(e){console.error("Failed to build ship sprites",e)}if(A.clear(),M&&M.clearRect(0,0,U.width,U.height),S){if(V("control")(),V("animate")(),De&&(z=De.read()),x){b=x.read();const e=b.levelnum,t=Ye(e);t!==Ge&&(console.log(`[Main] Switching background to: ${t} for level ${e}`),A.setBackgroundImage(pt(e)),Ge=t),b.dynamicBlocksChanged&&(S!=null&&S.runtime&&(P=Xe(S.runtime),Z=Se(S.runtime,Ee)),T&&P&&(A.setTileAtlas(P),A.setShipSprites(Z),A.buildLevel(T,P)),xe==null||xe()),Q.update(b,ge,T),K&&Ve>0&&b.numKeys<=0&&(ae||(ae=new ft(H)),ae.showMessage("PORTAL ACTIVATED",""),console.log("[Main] Portal activated - all keys collected")),Ve=b.numKeys}if(Oe&&(be=Oe.read().filter(e=>e.active)),$e&&(ge=$e.read()),g&&R){const{thrust:e,fire:t,rotate:s,nextLevel:i,prevLevel:o}=R.state,r=Be?24:16;if(K&&!Ne)if(g.setThrust(e*r),g.setFire(t?1:0),R.state.targetAngle!==void 0&&b){const a=-R.state.targetAngle-Math.PI/2,c=b.sa%16384/16384*Math.PI*2;let h=a-c;for(;h>Math.PI;)h-=Math.PI*2;for(;h<-Math.PI;)h+=Math.PI*2;const d=h*.1/(Math.PI*2)*16384;g.adjustAngle(d)}else if(s!==0){const a=performance.now();ye===0&&(ye=a);const h=a-ye>200?2:.5;g.adjustAngle(-s*Ss*h)}else ye=0;else if((b==null?void 0:b.levelnum)===0){if(!j&&(S!=null&&S.runtime)){const a=g.getDemoBufferPtr();J=g.getDemoCount(),a&&J>0&&(j=(S.runtime.HEAP32||new Int32Array(S.runtime.HEAPU8.buffer)).subarray(a>>2,(a>>2)+J*10),console.log(`[Main] Intro demo loaded: ${J} frames`))}if(j&&J>0){if(ee===0){const p=Math.floor(822);for(let m=0;m<p&&!(m>=J);m++){const w=m*10;g.setThrust(j[w+7]),g.setFire(j[w+8]),g.setSA(j[w+9]),V("control")()}ee=p}const c=ee%J*10,h=j[c+7],u=j[c+8],d=j[c+9];g.setThrust(h),g.setFire(u),g.setSA(d),ee++,ee>=J&&(g.restartLevel(),ee=0)}}if(K&&(i&&R&&(g.nextLevel(),R.state.nextLevel=!1,ue()),o&&R&&(g.prevLevel(),R.state.prevLevel=!1,ue()),R.state.toggleCheat)){g.toggleCheatMode(),R.state.toggleCheat=!1;const a=g.getCheatMode();console.log(`[Main] Cheat mode ${a?"ENABLED":"DISABLED"}: No wall collision, high fuel/time`)}}if(K&&b&&b.gameOver&&(ve||(ve=new vs(H,()=>{g==null||g.restartLevel(),ue()},()=>{if(K=!1,Q.setSfxVolume(.5),N==null||N.show(),x){let e=x.read().levelnum;const t=V("wasm_prev_level");let s=0;for(;e>0&&s++<20;)t(),e=x.read().levelnum;Q.update(x.read(),[],T)}})),ve&&b)){const e=V("get_current_level_name"),s=(i=>{const o=S.runtime.HEAPU8;let r=i;for(;o[r]!==0;)r++;return new TextDecoder().decode(o.subarray(i,r)).replace(/"/g,"")})(e());ve.show(s,b.shipScore)}}if(Is(),T&&P)if(!le||le.length!==T.tiles.length)le=new Uint8Array(T.tiles);else{const e=[];for(let t=0;t<T.tiles.length;t++)T.tiles[t]!==le[t]&&(e.push(t),le[t]=T.tiles[t]);e.length>0&&A.updateLevel(T,P)}if(T&&A.drawWorld(T,b,z,ze),b&&z&&A.drawShip(b,z,ze),T&&A.drawWorldForeground(),be.length&&A.drawBullets(be),ge.length&&P&&A.drawActions(ge,P),M&&(!T&&z&&Ts(M,z),b&&K&&Bt(M,b),Be&&K&&(qe.render(M),je.render(M),Ke.render(M)),(R==null?void 0:R.state.toggleDebug)??!1)){if(z){const t=g?g.getCheatMode():0;As(M,z,b,(R==null?void 0:R.state)??{thrust:0,fire:!1,rotate:0},!!t)}M.fillStyle="#0ff",M.font="16px monospace",M.fillText(`GravityWars WebGL - Δ=${n.toFixed(2)}ms`,20,30),M.fillStyle="#0f9",M.fillText(Me,20,60)}});function ue(){S!=null&&S.runtime&&(T=dt(S.runtime),P=Xe(S.runtime),Z=Se(S.runtime,Ee),T&&P&&(A.setTileAtlas(P),A.setShipSprites(Z),A.buildLevel(T,P))),be=[],Ve=-1}Ls.start();Vt().then(n=>{S=n,De=zt(n.runtime),x=Wt(n.runtime),T=dt(n.runtime),g=_s(n.runtime),xe=re(n.runtime,"wasm_clear_dynamic_blocks"),we=re(n.runtime,"wasm_advance_level"),Oe=Jt(n.runtime),$e=cs(n.runtime),V("init_gw")(),V("main_init")();let e=x.read().levelnum;console.log(`[Main] Initial level: ${e}. Setting to 0 (Attractor)...`);let t=0;const s=V("wasm_prev_level"),i=V("wasm_next_level");for(;e>0&&t<20;)s(),e=x.read().levelnum,t++;for(;e<0&&t<20;)i(),e=x.read().levelnum,t++;console.log(`[Main] Level set to: ${e}`),N||(N=new gs(H,o=>{console.log(`[Main] Starting game at level ${o}`),Q.setSfxVolume(1),N==null||N.hide(),Be&&(document.body.style.height="110vh",window.scrollTo(0,1),setTimeout(()=>{document.body.style.overflow="hidden",document.body.style.height="100dvh"},500));const r=o;console.log(`[Main] Navigating to level ${r} (user selected ${o})...`);let a=(x==null?void 0:x.read().levelnum)??0,c=0;const h=100;for(;a!==r&&c<h;)a<r?g==null||g.nextLevel():g==null||g.prevLevel(),a=(x==null?void 0:x.read().levelnum)??0,c++;console.log(`[Main] Level navigation complete after ${c} iterations. Current Level: ${a}`),He(),Q.update(x.read(),[],T)}),N.show()),P=Xe(n.runtime),console.log("DEBUG: TileAtlas created",P),Z=Se(n.runtime,Ee),T&&P&&(A.setTileAtlas(P),A.setShipSprites(Z),A.buildLevel(T,P)),Me="WASM module ready."}).catch(n=>{Me=`WASM unavailable: ${n.message}`,console.warn(n)});
