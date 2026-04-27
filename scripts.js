let images = [];
let results = [];
let page = 0;
const perPage = 20;
const BATCH_SIZE = 5;

const drop = document.getElementById("drop");
const fileInput = document.getElementById("file");

drop.onclick = () => fileInput.click();

drop.ondragover = e => { e.preventDefault(); drop.style.background="#eee"; };
drop.ondragleave = () => drop.style.background="#fff";
drop.ondrop = e => {
  e.preventDefault();
  handleFile(e.dataTransfer.files[0]);
};

fileInput.onchange = e => handleFile(e.target.files[0]);

document.getElementById("range").oninput = e => {
  document.getElementById("val").innerText = e.target.value;
};

async function fetchImages(){
  const res = await fetch("fetch_images.php");
  images = await res.json();
}

function histogram(img){
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");

  c.width = 80;
  c.height = 80;
  ctx.drawImage(img,0,0,80,80);

  const data = ctx.getImageData(0,0,80,80).data;
  const hist = new Array(64).fill(0);

  for(let i=0;i<data.length;i+=4){
    const r = data[i]>>6;
    const g = data[i+1]>>6;
    const b = data[i+2]>>6;
    hist[r*16 + g*4 + b]++;
  }

  const norm = Math.sqrt(hist.reduce((a,b)=>a+b*b,0));
  return hist.map(x=>x/norm);
}

function cosine(a,b){
  let sum = 0;
  for(let i=0;i<a.length;i++) sum += a[i]*b[i];
  return sum;
}

function loadImage(src){
  return new Promise(res=>{
    const img = new Image();
    img.crossOrigin="anonymous";
    img.onload = ()=>res(img);
    img.src = src;
  });
}

async function getEmbedding(item){
  let cached = localStorage.getItem(item.image);
  if(cached) return JSON.parse(cached);

  const img = await loadImage(item.image);
  const emb = histogram(img);
  localStorage.setItem(item.image, JSON.stringify(emb));
  return emb;
}

async function processBatch(batch, query, threshold){
  const promises = batch.map(async item=>{
    const emb = await getEmbedding(item);
    const sim = cosine(query, emb);
    const percent = Math.round(sim * 100);

    if(percent >= threshold){
      return {...item, percent};
    }
    return null;
  });

  const res = await Promise.all(promises);
  return res.filter(Boolean);
}

async function handleFile(file){
  document.getElementById("status").innerText="Processing...";

  const img = await loadImage(URL.createObjectURL(file));
  const query = histogram(img);

  await fetchImages();

  const threshold = document.getElementById("range").value;
  results = [];

  for(let i=0;i<images.length;i+=BATCH_SIZE){
    const batch = images.slice(i, i+BATCH_SIZE);
    const res = await processBatch(batch, query, threshold);
    results.push(...res);
  }

  results.sort((a,b)=>b.percent-a.percent);
  page = 0;
  render();

  document.getElementById("status").innerText="Done";
}

function render(){
  const grid = document.getElementById("grid");
  grid.innerHTML="";

  const start = page * perPage;
  const slice = results.slice(start, start+perPage);

  slice.forEach(r=>{
    grid.innerHTML += `
      <div class="card">
        <img src="${r.image}" loading="lazy">
        <p>${r.name}</p>
        <b>${r.percent}%</b>
      </div>
    `;
  });
}

function next(){
  if((page+1)*perPage < results.length){
    page++;
    render();
  }
}

function prev(){
  if(page>0){
    page--;
    render();
  }
}