/*
  script.js
  - Representación y operaciones con números complejos
  - Construcción de la UI: crear matriz N×N y leer entradas
  - Cálculo del determinante por: (A) Levi–Civita (ε), (B) Laplace (expansión por menores)
  - Mostrar pasos numéricos (productos complejos) para claridad
  - Autor: Sebastián Alí — contacto: sebastian.sacasa@ucr.ac.cr
*/

// -------------------- Operaciones con números complejos --------------------
function C(re, im){ return { re: Number(re) || 0, im: Number(im) || 0 }; }
function cAdd(a, b){ return { re: a.re + b.re, im: a.im + b.im }; }
function cSub(a, b){ return { re: a.re - b.re, im: a.im - b.im }; }
function cMul(a, b){
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cScale(a, s){ return { re: a.re * s, im: a.im * s }; }
function cEq(a, b){ return Math.abs(a.re - b.re) < 1e-12 && Math.abs(a.im - b.im) < 1e-12; }
function cToString(a){
  const re = Math.round(a.re * 1e12)/1e12; const im = Math.round(a.im * 1e12)/1e12;
  if(Math.abs(im) < 1e-12) return `${re}`;
  if(Math.abs(re) < 1e-12) return `${im}i`;
  const sign = im >= 0 ? '+' : '';
  return `${re}${sign}${im}i`;
}

// -------------------- Parsers de entrada (acepta formas como 1, -2/3, 1+2i, -i, 3/2, 4i) --------------------
function parseEntry(str){
  str = String(str).trim();
  if(str === '') return C(0,0);
  // Replace whitespace
  str = str.replace(/\s+/g,'');
  // Handle pure imaginary like 'i' or '-i' or '3i'
  if(/^([+-]?)(\d*\.?\d+)?i$/.test(str)){
    const m = str.match(/^([+-]?)(\d*\.?\d+)?i$/);
    const sign = m[1]==='-'?-1:1;
    const num = m[2] ? parseFloat(m[2]) : 1;
    return C(0, sign * num);
  }
  // Handle fraction with optional imaginary part (like '3/2' or '3/2+1/4i' not implemented) => first try simple fraction
  if(/^([+-]?\d+\/\d+)$/.test(str)){
    const parts = str.split('/');
    return C(parseFloat(parts[0])/parseFloat(parts[1]), 0);
  }
  // Handle a+bi or a-bi
  const imagMatch = str.match(/^(.+?)([+-][0-9]*\.?[0-9]*)i$/);
  if(imagMatch){
    const rePart = imagMatch[1];
    const imPart = imagMatch[2];
    let re = 0;
    // re can be fraction
    if(/\//.test(rePart)){
      const p = rePart.split('/'); re = parseFloat(p[0]) / parseFloat(p[1]);
    } else re = parseFloat(rePart);
    let im = parseFloat(imPart);
    return C(re, im);
  }
  // Otherwise try plain number
  if(/^[+-]?\d*\.?\d+$/.test(str)) return C(parseFloat(str), 0);

  // Fallback: try to evaluate fraction-like 'a/b'
  if(str.includes('/')){ const p = str.split('/'); return C(parseFloat(p[0]) / parseFloat(p[1]), 0); }

  // If cannot parse, return zero and log
  console.warn('No se pudo parsear entrada:', str);
  return C(0,0);
}

// -------------------- UI: crear inputs para matriz --------------------
const matrixArea = document.getElementById('matrixArea');
const sizeInput = document.getElementById('size');
const createBtn = document.getElementById('create');
const fillBtn = document.getElementById('fillExample');
const computeBtn = document.getElementById('compute');
const clearBtn = document.getElementById('clear');

function createMatrixInputs(N){
  matrixArea.innerHTML = '';
  matrixArea.style.gridTemplateColumns = `repeat(${N}, auto)`;
  for(let i=0;i<N;i++){
    for(let j=0;j<N;j++){
      const inp = document.createElement('input');
      inp.type = 'text'; inp.id = `a-${i}-${j}`; inp.placeholder = 'a+bi';
      inp.value = (i===j)? '1' : '0';
      matrixArea.appendChild(inp);
    }
  }
}

createBtn.addEventListener('click', ()=>{ createMatrixInputs(Number(sizeInput.value) || 1); });

fillBtn.addEventListener('click', ()=>{
  const N = 4; sizeInput.value = N; createMatrixInputs(N);
  // Ejemplo 4x4 con entradas complejas (no simbólicas)
  const example = [
    ['1+2i','0','-1+i','3i'],
    ['2','-i','1+0i','1/2'],
    ['-1+3i','4','2-i','0'],
    ['0','1+1i','-2','3']
  ];
  for(let i=0;i<N;i++) for(let j=0;j<N;j++) document.getElementById(`a-${i}-${j}`).value = example[i][j];
});

clearBtn.addEventListener('click', ()=>{
  document.getElementById('detEps').textContent = '—';
  document.getElementById('detLaplace').textContent = '—';
  document.getElementById('comparison').textContent = '—';
  document.getElementById('steps').innerHTML = '';
});

// -------------------- Lectura de matriz en forma de objetos complejos --------------------
function readMatrix(N){
  const M = new Array(N);
  for(let i=0;i<N;i++){ M[i]= new Array(N);
    for(let j=0;j<N;j++){ M[i][j] = parseEntry(document.getElementById(`a-${i}-${j}`).value); }
  }
  return M;
}

// -------------------- Generador de permutaciones y signo de permutación --------------------
function permutations(arr){
  // devuelve array de permutaciones (cada perm es array)
  if(arr.length === 0) return [[]];
  const res = [];
  for(let i=0;i<arr.length;i++){
    const rest = arr.slice(0,i).concat(arr.slice(i+1));
    for(const perm of permutations(rest)) res.push([arr[i], ...perm]);
  }
  return res;
}

function parityOfPermutation(perm){
  // cuenta inversiones
  let inv = 0;
  for(let i=0;i<perm.length;i++) for(let j=i+1;j<perm.length;j++) if(perm[i] > perm[j]) inv++;
  return (inv % 2 === 0) ? 1 : -1;
}

// -------------------- Determinante por Levi–Civita (ε) --------------------
function determinantEpsilon(M){
  const N = M.length;
  // columnas indices 0..N-1
  const cols = Array.from({length:N},(_,i)=>i);
  const perms = permutations(cols);
  let acc = C(0,0);
  const steps = [];
  for(const p of perms){
    const sign = parityOfPermutation(p);
    // product of a_{i, p[i]} for i=0..N-1
    let prod = C(1,0);
    for(let i=0;i<N;i++) prod = cMul(prod, M[i][p[i]]);
    // multiply by sign
    if(sign === -1) prod = cScale(prod, -1);
    acc = cAdd(acc, prod);
    // Opcional: guardar paso (sólo para matrices pequeñas)
    if(N <= 5){
      const termStr = `sign=${sign}, perm=[${p.join(',')}], term=${cToString(prod)}`;
      steps.push(termStr);
    }
  }
  return {det: acc, steps};
}

// -------------------- Determinante por Laplace (expansión por menores) --------------------
function minorMatrix(M, row, col){
  // construye la matriz menor removiendo 'row' y 'col'
  const N = M.length;
  const R = [];
  for(let i=0;i<N;i++){
    if(i===row) continue;
    const nr = [];
    for(let j=0;j<N;j++) if(j!==col) nr.push(M[i][j]);
    R.push(nr);
  }
  return R;
}

function determinantLaplace(M, depth=0){
  const N = M.length;
  if(N === 1) return M[0][0];
  if(N === 2){
    // |[a b; c d]| = ad - bc
    const ad = cMul(M[0][0], M[1][1]);
    const bc = cMul(M[0][1], M[1][0]);
    return cSub(ad, bc);
  }
  let acc = C(0,0);
  // expand along first row (row=0)
  for(let j=0;j<N;j++){
    const a = M[0][j];
    const sign = ((0 + j) % 2 === 0) ? 1 : -1;
    const minor = minorMatrix(M, 0, j);
    const detMinor = determinantLaplace(minor, depth+1);
    let term = cMul(a, detMinor);
    if(sign === -1) term = cScale(term, -1);
    acc = cAdd(acc, term);
  }
  return acc;
}

// -------------------- Mostrar pasos y comparar --------------------
computeBtn.addEventListener('click', ()=>{
  const N = Number(sizeInput.value) || 1;
  const M = readMatrix(N);
  // Levi–Civita
  const epsRes = determinantEpsilon(M);
  document.getElementById('detEps').textContent = cToString(epsRes.det);

  // Laplace
  const lap = determinantLaplace(M);
  document.getElementById('detLaplace').textContent = cToString(lap);

  // Comparación
  const cmp = cEq(epsRes.det, lap) ? 'Coinciden' : 'DIFERENCIAS (comprobar precisión numérica)';
  document.getElementById('comparison').textContent = cmp;

  // Pasos: mostrar algunos términos de ε
  const stepsDiv = document.getElementById('steps'); stepsDiv.innerHTML = '';
  if(epsRes.steps && epsRes.steps.length){
    const ul = document.createElement('ul');
    for(const s of epsRes.steps){ const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); }
    stepsDiv.appendChild(ul);
  }
});

// Inicialización por defecto
createMatrixInputs(Number(sizeInput.value) || 4);

