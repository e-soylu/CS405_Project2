function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
    var trans1 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];
    var rotatXCos = Math.cos(rotationX);
    var rotatXSin = Math.sin(rotationX);

    var rotatYCos = Math.cos(rotationY);
    var rotatYSin = Math.sin(rotationY);

    var rotatx = [
        1, 0, 0, 0,
        0, rotatXCos, -rotatXSin, 0,
        0, rotatXSin, rotatXCos, 0,
        0, 0, 0, 1
    ];

    var rotaty = [
        rotatYCos, 0, -rotatYSin, 0,
        0, 1, 0, 0,
        rotatYSin, 0, rotatYCos, 0,
        0, 0, 0, 1
    ];

    var test1 = MatrixMult(rotaty, rotatx);
    var test2 = MatrixMult(trans1, test1);
    var mvp = MatrixMult(projectionMatrix, test2);

    return mvp;
}

class MeshDrawer {
    constructor() {
        this.prog = InitShaderProgram(meshVS, meshFS);
        this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
        this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');

        this.colorLoc = gl.getUniformLocation(this.prog, 'color');

        this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
        this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
        this.normLoc = gl.getAttribLocation(this.prog, 'normal');

        this.vertbuffer = gl.createBuffer();
        this.texbuffer = gl.createBuffer();
        this.normbuffer = gl.createBuffer();

        this.numTriangles = 0;

        // Initialize lighting-related uniforms
        this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
        this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');
        this.enableLightingLoc = gl.getUniformLocation(this.prog, 'enableLighting');
        this.specularLoc = gl.getUniformLocation(this.prog, 'shininess');
    }

    setMesh(vertPos, texCoords, normalCoords) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);

        this.numTriangles = vertPos.length / 3;
    }

    draw(trans) {
        gl.useProgram(this.prog);

        gl.uniformMatrix4fv(this.mvpLoc, false, trans);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
        gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertPosLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
        gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.texCoordLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
        gl.vertexAttribPointer(this.normLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normLoc);
        

        // Update light position
        gl.uniform3fv(this.colorLoc, [0.8, 0.8, 0.8]);

        gl.uniform3fv(this.lightPosLoc, [-lightX, -lightY, 0]);

        updateLightPos();
        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }

    setTexture(img) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            img
        );

        if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // Handle non-power-of-2 textures
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

        gl.useProgram(this.prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const sampler = gl.getUniformLocation(this.prog, 'tex');
        gl.uniform1i(sampler, 0);
    }

    showTexture(show) {
        gl.useProgram(this.prog);
        gl.uniform1i(this.showTexLoc, show);
    }

    enableLighting(show) {
        gl.useProgram(this.prog);
        gl.uniform1i(this.enableLightingLoc, show);
    }

    setAmbientLight(ambient) {
        gl.useProgram(this.prog);
        gl.uniform1f(this.ambientLoc, ambient);
    }
    setSpecularLight(specular){
        gl.useProgram(this.prog);
        gl.uniform1f(this.specularLoc, specular);
    }
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

function updateLightPos() {
    const translationSpeed = 1;
    if (keys['ArrowUp']) lightY -= translationSpeed;
    if (keys['ArrowDown']) lightY += translationSpeed;
    if (keys['ArrowRight']) lightX -= translationSpeed;
    if (keys['ArrowLeft']) lightX += translationSpeed;
}

// Vertex shader source code
const meshVS = `
    attribute vec3 pos; 
    attribute vec2 texCoord; 
    attribute vec3 normal;

    uniform mat4 mvp; 

    varying vec2 v_texCoord; 
    varying vec3 v_normal; 
    varying vec3 fragPos;

    void main() {
        v_texCoord = texCoord;
        v_normal = normal;

        fragPos = vec3(mvp * vec4(pos, 1.0));
        gl_Position = mvp * vec4(pos, 1.0);
    }
`;

// Fragment shader source code
const meshFS = `
    precision mediump float;

    uniform bool showTex;
    uniform bool enableLighting;

    uniform sampler2D tex;

    uniform vec3 lightPos;
    uniform vec3 color;

    uniform float ambient;
    uniform float shininess;

    varying vec2 v_texCoord;
    varying vec3 v_normal;
    varying vec3 fragPos;

    uniform sampler2D tex2;
    

    void main() {
        if (showTex && enableLighting) {
            vec3 ambientLight = ambient * vec3(texture2D(tex, v_texCoord));

            vec3 norm = normalize(v_normal);
            vec3 lightDir = normalize(lightPos - fragPos);

            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuseLight = diff * vec3(1.0);

            vec3 reflectDir = reflect(-lightDir, norm);
            float spec = pow(max(dot(vec3(0,0,-1), reflectDir), 0.0), shininess);
            vec3 specular = color * spec;


            vec4 textureColor1 = texture2D(tex, v_texCoord);
            vec4 textureColor2 = texture2D(tex2, v_texCoord);
            vec4 blendedTexture = mix(textureColor1, textureColor2, 0.5);

            vec3 lighting = ambientLight + diffuseLight + specular;
            gl_FragColor = vec4(lighting, 1.0) * texture2D(tex, v_texCoord);


        } 
        else if (showTex) {
            gl_FragColor = texture2D(tex, v_texCoord);
        } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    }
`;

// Light direction parameters
var lightX = 1;
var lightY = 1;

const keys = {};
