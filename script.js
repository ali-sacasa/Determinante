// ===============================================================
// Creación de la matriz de entrada
// ===============================================================
function createMatrixInput() {
    const N = parseInt(document.getElementById('matrixSize').value) || 4;
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
// Parseo básico de números complejos
// ===============================================================
function parseComplex(str) {
    str = str.trim();
    if (str === '') return { re: 0, im: 0 };
    if (str === 'i') return { re: 0, im: 1 };
    if (str === '-i') return { re: 0, im: -1 };

    const match = str.match(/^([+-]?\d*\.?\d*)([+-]\d*\.?\d*)i$/);
    if (match) {
        return { re: parseFloat(match[1]), im: parseFloat(match[2]) };
    } else if (str.includes('i')) {
        const val = parseFloat(str.replace('i', ''));
        return { re: 0, im: val };
    } else {
        return { re: parseFloat(str), im: 0 };
    }
}

function complexMultiply(a, b) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function complexAdd(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
}

function complexToString(a) {
    if (a.im === 0) return a.re.toFixed(2);
    if (a.re === 0) return `${a.im.toFixed(2)}i`;
    const sign = a.im >= 0 ? '+' : '';
    return `${a.re.toFixed(2)}${sign}${a.im.toFixed(2)}i`;
}

// ===============================================================
// Determinante tensorial: |A| = ε_{ijk...n} a_{1i} a_{2j} ... a_{nn}
// ===============================================================
function determinantTensorial(A) {
    const N = A.length;
    let det = { re: 0, im: 0 };

    function permSign(p) {
        let inv = 0;
        for (let i = 0; i < p.length; i++)
            for (let j = i + 1; j < p.length; j++)
                if (p[i] > p[j]) inv++;
        return inv % 2 === 0 ? 1 : -1;
    }

    function permutations(arr) {
        if (arr.length === 1) return [arr];
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
            for (const p of permutations(rest)) result.push([arr[i], ...p]);
        }
        return result;
    }

    const perms = permutations([...Array(N).keys()]);

    for (const p of perms) {
        let term = { re: 1, im: 0 };
        for (let i = 0; i < N; i++) {
            term = complexMultiply(term, A[i][p[i]]);
        }
        const sign = permSign(p);
        if (sign === 1) det = complexAdd(det, term);
        else det = complexAdd(det, { re: -term.re, im: -term.im });
    }

    return det;
}

// ===============================================================
// Determinante por desarrollo de Laplace
// ===============================================================
function determinantLaplace(A) {
    const N = A.length;
    if (N === 1) return A[0][0];

    let det = { re: 0, im: 0 };

    for (let j = 0; j < N; j++) {
        const subMatrix = A.slice(1).map(row => row.filter((_, col) => col !== j));
        const subDet = determinantLaplace(subMatrix);
        const sign = (j % 2 === 0) ? 1 : -1;
        const term = complexMultiply(A[0][j], subDet);
        if (sign === 1) det = complexAdd(det, term);
        else det = complexAdd(det, { re: -term.re, im: -term.im });
    }

    return det;
}

// ===============================================================
// Función principal
// ===============================================================
function calculateDeterminant() {
    const N = parseInt(document.getElementById('matrixSize').value);
    const A = [];

    for (let i = 0; i < N; i++) {
        const row = [];
        for (let j = 0; j < N; j++) {
            const val = document.getElementById(`a-${i}-${j}`).value.trim();
            row.push(parseComplex(val));
        }
        A.push(row);
    }

    const detTensor = determinantTensorial(A);
    const detLaplace = determinantLaplace(A);

    document.getElementById('result').innerHTML = `
        <p>Determinante tensorial:</p>
        $$|A|_\text{tensorial} = ${complexToString(detTensor)}$$
        <p>Desarrollo por Laplace:</p>
        $$|A|_\text{Laplace} = ${complexToString(detLaplace)}$$
    `;
    MathJax.typesetPromise();
}

document.addEventListener('DOMContentLoaded', createMatrixInput);
```
