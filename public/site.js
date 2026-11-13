(() => {
  const header=document.querySelector(".site-header");
  const button=document.getElementById("menuToggle");
  const nav=document.getElementById("mainNav");
  if(button&&nav){
    button.addEventListener("click",()=>{
      const open=nav.classList.toggle("open");
      button.setAttribute("aria-expanded",String(open));
      button.textContent=open?"✕ Close":"☰ Menu";
    });
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
      nav.classList.remove("open");
      button.setAttribute("aria-expanded","false");
      button.textContent="☰ Menu";
    }));
  }
  document.querySelectorAll(".nav-more").forEach(menu=>{
    menu.addEventListener("toggle",()=>{if(menu.open)document.querySelectorAll(".nav-more").forEach(other=>{if(other!==menu)other.open=false;});});
  });
  const year=document.getElementById("year");
  if(year)year.textContent=new Date().getFullYear();
})();