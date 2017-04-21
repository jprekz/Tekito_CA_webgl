#version 300 es

precision highp float;
precision mediump isampler2D;

uniform vec2 resolution;
uniform isampler2D cells;

out vec4 fragColor;

vec3 hsv(float h, float s, float v){
    vec4 t = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(vec3(h) + t.xyz) * 6.0 - vec3(t.w));
    return v * mix(vec3(t.x), clamp(p - vec3(t.x), 0.0, 1.0), s);
}

void main(void){
    vec2 p = vec2(gl_FragCoord.x / resolution.x, gl_FragCoord.y / resolution.y);

    ivec4 smpColor = texture(cells, p);

    int value = smpColor.r;
    int thermal = smpColor.g;
    vec3 rgb = hsv(float(256 - thermal) / 400.0, 0.8, float(smpColor.r) / 255.0);
    fragColor = vec4(rgb, 1.0);
}