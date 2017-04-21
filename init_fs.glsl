#version 300 es

precision highp float;

uniform vec2 resolution;
uniform vec2 seed;

out uvec4 fragColor;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main(void){
    vec2 p = seed * vec2(gl_FragCoord.x / resolution.x, gl_FragCoord.y / resolution.y);
    fragColor = uvec4(uint(rand(p) * 255.0), 0, 0, 255);
}