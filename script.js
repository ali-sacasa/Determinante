// ===============================================================
// Parser de entradas: reales, fracciones, complejos y simbólicos
// ===============================================================
function isNumeric(val) {
    return typeof val === 'number' && isFinite(val);
}

function parseMathExpression(expr) {
    expr = expr.trim().replace(/\s+/g, '');
    if (expr === '') return 0;
    if (expr === 'i') return 1;
    if (/[a-zA-Z]/.test(expr)) return expr;

    const frac = expr.match(/^([+-]?\d*\.?\d*)\/([+-]?\d*\.?\d*)$/);
    if (frac) {
        const num = parseFloat(frac[1]) || 0;
        const den = parseFloat(frac[2]) || 1;
        return den !== 0 ? num / den : 0;
    }
    try {
        const result = eval(expr);
        return isFinite(result) ? result : expr;
    } catch {
        return expr;
    }
}

function parseComplexToComponents(str) {
    str = str.trim().replace(/\s+/g, '');
    if (str === '') return { re: 0, im: 0 };
    if (str === 'i') return { re: 0, im: 1 };
    if (str === '-i') return { re: 0, im: -1 };
    if (!str.includes('i')) return { re: parseMathExpression(str), im: 0 };

    const onlyImag = str.match(/^([+-]?\w*\.?\w*)i$/);
    if (onlyImag) {
        const im = onlyImag[1] === '' || onlyImag[1] === '+' ? 1 :
                   onlyImag[1] === '-' ? -1 : parseMathExpression(onlyImag[1]);
        return { re: 0, im };
    }

    const match = str.match(/^(.+?)([+-].*i)$/);
    if (match) {
        const re = parseMathExpression(match[1]);
        const im = parseMathExpression(match[2].replace('i', ''));
        return { re, im };
    }
    return { re: 0, im: 0 };
}

// ===============================================================
// Operaciones complejas básicas
// ===============================================================
function complexMultiply(a, b) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function complexToString(a) {
    if (a.im === 0) return a.re.toString();
    if (a.re === 0) return `${a.im}i`;
    const sign = a.im >= 0 ? '+' : '';
    return `${a.re}${sign}${a.im}i`;
}

// ===============================================================
// Creación de la matriz en pantalla
// ===============================================================
function createMatrixInput() {
    const N = parseInt(document.getElementById('matrixSize').value) || 3;
    const container = document.getElementById('matrixContainer');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${N}, 70px)`;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `a-${i}-${j}`;
            input.placeholder = 'a+bi';
            input.value = (i === j) ? '1' : '0';
            container.appendChild(input);
        }
    }
}

// ===============================================================
// Lectura y detección de modo simbólico
// ===============================================================
function getMatrixDataFromInput() {
    const N = parseInt(document.getElementById('matrixSize').value);
    const real = new Float64Array(N * N);
    const imag = new Float64Array(N * N);
    let hasSymbolic = false;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const val = document.getElementById(`a-${i}-${j}`).value.trim();
            const c = parseComplexToComponents(val);
            const idx = i * N + j;
            if (isNumeric(c.re) && isNumeric(c.im)) {
                real[idx] = c.re; imag[idx] = c.im;
            } else hasSymbolic = true;
        }
    }
    return { N, real, imag, hasSymbolic };
}

// ===============================================================
// Determinante numérico (LU simplificado)
// ===============================================================
function determinantLU(real, imag, N) {
    const aRe = real.slice();
    const aIm = imag.slice();
    let detRe = 1, detIm = 0;

    for (let k = 0; k < N; k++) {
        const idx = k * N + k;
        const pr = aRe[idx], pi = aIm[idx];
        const mag = pr * pr + pi * pi;
        if (mag === 0) return { re: 0, im: 0 };

        for (let i = k + 1; i < N; i++) {
            const fIdx = i * N + k;
            const fr = (aRe[fIdx] * pr + aIm[fIdx] * pi) / mag;
            const fi = (aIm[fIdx] * pr - aRe[fIdx] * pi) / mag;
            for (let j = k; j < N; j++) {
                const i1 = i * N + j, k1 = k * N + j;
                const m = complexMultiply({ re: fr, im: fi }, { re: aRe[k1], im: aIm[k1] });
                aRe[i1] -= m.re;
                aIm[i1] -= m.im;
            }
        }
        const d = complexMultiply({ re: detRe, im: detIm }, { re: pr, im: pi });
        detRe = d.re; detIm = d.im;
    }
    return { re: detRe, im: detIm };
}

// ===============================================================
// Determinante simbólico con math.js (corregido)
// ===============================================================
function calculateSymbolicDeterminant() {
    const N = parseInt(document.getElementById('matrixSize').value);
    const matrix = [];

    for (let i = 0; i < N; i++) {
        const row = [];
        for (let j = 0; j < N; j++) {
            let val = document.getElementById(`a-${i}-${j}`).value.trim();
            if (val === '') val = '0';
            row.push(val);
        }
        matrix.push(row);
    }

    try {
        // 🟢 CORRECCIÓN CLAVE: convertir todo a cadenas y parsear de forma segura
        const symbolicMatrix = math.matrix(
            matrix.map(row =>
                row.map(cell => math.parse(cell.toString()))
            )
        );
        const determinant = math.simplify(math.det(symbolicMatrix));
        const detStr = determinant.toString();

        document.getElementById('resultLaplace').innerHTML = `$$${detStr}$$`;
        MathJax.typesetPromise();
    } catch (e) {
        document.getElementById('resultLaplace').textContent =
            `Error simbólico: ${e.message}`;
    }
}

// ===============================================================
// Función principal
// ===============================================================
function calculateDeterminant() {
    const { N, real, imag, hasSymbolic } = getMatrixDataFromInput();
    const result = document.getElementById('resultLaplace');

    if (hasSymbolic) {
        calculateSymbolicDeterminant();
        return;
    }

    try {
        const det = determinantLU(real, imag, N);
        result.textContent = complexToString(det);
    } catch (e) {
        result.textContent = `Error: ${e.message}`;
    }
}

// ===============================================================
document.addEventListener('DOMContentLoaded', createMatrixInput);
