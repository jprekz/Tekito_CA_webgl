#version 300 es

precision highp float;
precision highp usampler2D;

uniform vec2 resolution;
uniform usampler2D cells;
uniform int rule[9];

out uvec4 fragColor;

void main(void){
    vec2 p = vec2(gl_FragCoord.x / resolution.x, gl_FragCoord.y / resolution.y);

    float px_x = 1.0 / resolution.x;
    float px_y = 1.0 / resolution.y;

    int self = int(texture(cells, p).r);

    int sum = int(
        texture(cells, vec2(p.x - px_x, p.y - px_y)).r +
        texture(cells, vec2(p.x - px_x, p.y       )).r +
        texture(cells, vec2(p.x - px_x, p.y + px_y)).r +
        texture(cells, vec2(p.x       , p.y - px_y)).r +
        texture(cells, vec2(p.x       , p.y + px_y)).r +
        texture(cells, vec2(p.x + px_x, p.y - px_y)).r +
        texture(cells, vec2(p.x + px_x, p.y       )).r +
        texture(cells, vec2(p.x + px_x, p.y + px_y)).r);

    int value = 0;

    for (int t = 0; t < 9; t++) {
        if (rule[t] == 0) continue;
        if ((t-1) * 255 <= sum && sum < (t+1) * 255) {
            int v = 255 - abs(sum - (t * 255));
            if (rule[t] == 1) value += v * (255 - self) / 255;
            if (rule[t] == 2) value += v * self / 255;
            if (rule[t] == 3) value += v;
        }
    }

    uint before = texture(cells, p).g;
    uint thermal = before / 2u + uint(abs(self - value));

    fragColor = uvec4(value, thermal, 0, 255);
}
