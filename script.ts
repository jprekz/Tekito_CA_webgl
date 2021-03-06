let run = true;
function ca_stop() { run = false; }

const WIDTH = 512;
const HEIGHT = 256;
const ZOOM = 3;

async function fetch_glsl(name: RequestInfo): Promise<string> {
    const res = await fetch(name);
    return res.text();
}

window.addEventListener("load", async _ => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');

    const cw = canvas.width = WIDTH * ZOOM;
    const ch = canvas.height = HEIGHT * ZOOM;

    const [common_vs_glsl, init_fs_glsl, process_fs_glsl, render_fs_glsl] = await Promise.all([
        'common_vs.glsl', 'init_fs.glsl', 'process_fs.glsl', 'render_fs.glsl'
    ].map(fetch_glsl));
    const common_vs = create_VertexShader(common_vs_glsl);
    const init_fs = create_FragmentShader(init_fs_glsl);
    const process_fs = create_FragmentShader(process_fs_glsl);
    const render_fs = create_FragmentShader(render_fs_glsl);

    const initProgram = create_program(common_vs, init_fs, ['resolution', 'seed'], ['position']);
    const processProgram = create_program(common_vs, process_fs, ['resolution', 'cells', 'rule'], ['position']);
    const renderProgram = create_program(common_vs, render_fs, ['resolution', 'cells'], ['position']);

    let backBuffer = create_framebuffer(WIDTH, HEIGHT);
    let frontBuffer = create_framebuffer(WIDTH, HEIGHT);

    const model = {
        vbo: create_vbo([
            -1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, 1.0, 0.0,
            1.0, -1.0, 0.0
        ]),
        length: 4,
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, model.vbo);
    gl.enableVertexAttribArray(initProgram.attLocation.position);
    gl.vertexAttribPointer(initProgram.attLocation.position, 3, gl.FLOAT, false, 0, 0);

    // init
    gl.useProgram(initProgram.program);
    // 描画先
    gl.bindFramebuffer(gl.FRAMEBUFFER, backBuffer.framebuffer); // backへ
    gl.viewport(0, 0, WIDTH, HEIGHT);
    // バインド
    gl.uniform2fv(initProgram.uniLocation.resolution, [WIDTH, HEIGHT]);
    gl.uniform2fv(initProgram.uniLocation.seed, [Math.random(), Math.random()]);
    // 頂点を描画
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, model.length);

    gl.useProgram(processProgram.program);
    gl.uniform1i(processProgram.uniLocation.texture, 0);
    gl.uniform2fv(processProgram.uniLocation.resolution, [WIDTH, HEIGHT]);
    gl.uniform1iv(processProgram.uniLocation.rule, [3, 3, 0, 2, 1, 2, 2, 3, 3]);

    gl.useProgram(renderProgram.program);
    gl.uniform1i(renderProgram.uniLocation.texture, 0);
    gl.uniform2fv(renderProgram.uniLocation.resolution, [WIDTH * ZOOM, HEIGHT * ZOOM]);

    function renderFrame() {
        // process
        gl.useProgram(processProgram.program);
        // 描画先
        gl.bindFramebuffer(gl.FRAMEBUFFER, frontBuffer.framebuffer); // frontへ
        gl.viewport(0, 0, WIDTH, HEIGHT);
        // バインド
        gl.bindTexture(gl.TEXTURE_2D, backBuffer.texture); // backから
        // 頂点を描画
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, model.length);

        // render
        gl.useProgram(renderProgram.program);
        // 描画先
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // 画面へ
        gl.viewport(0, 0, cw, ch);
        // バインド
        gl.bindTexture(gl.TEXTURE_2D, frontBuffer.texture); // frontから
        // 頂点を描画
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, model.length);

        // flush!
        gl.flush();
        // swap!
        [frontBuffer, backBuffer] = [backBuffer, frontBuffer];

        if (run) requestAnimationFrame(renderFrame);
    }
    renderFrame();

    function create_vbo(data: Iterable<number>): WebGLBuffer {
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    function create_framebuffer(width: number, height: number) {
        var frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

        var fTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, width, height, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return { framebuffer: frameBuffer, texture: fTexture };
    }

    function create_Shader(data: string, type: number): WebGLShader {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, data);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            return;
        }
        return shader;
    }

    function create_VertexShader(data: string): WebGLShader {
        return create_Shader(data, gl.VERTEX_SHADER);
    }

    function create_FragmentShader(data: string): WebGLShader {
        return create_Shader(data, gl.FRAGMENT_SHADER);
    }

    function create_program(vs: WebGLShader, fs: WebGLShader, uni: string[], att: string[]) {
        let program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return;
        }

        let uniLocation: { [name: string]: WebGLUniformLocation } = {};
        uni.forEach((name: string) => {
            uniLocation[name] = gl.getUniformLocation(program, name);
        });

        let attLocation: { [name: string]: number } = {};
        att.forEach((name: string) => {
            attLocation[name] = gl.getAttribLocation(program, name);
        });

        return { program, uniLocation, attLocation };
    }
});
