import html2canvas from "html2canvas";
import {jsPDF} from "jspdf";
import {accountingDownload} from "./accountingDownload";
export async function accountingPdf(root:HTMLElement,filename:string,download=true){
 await document.fonts.ready;
 const pdf=new jsPDF({unit:"mm",format:"a4",compress:true});
 const sheets=Array.from(root.querySelectorAll<HTMLElement>("[data-print-sheet]"));
 if(!sheets.length)throw Error("لا توجد صفحات للطباعة");
 for(let i=0;i<sheets.length;i++){
  const sheet=sheets[i];
  for(const image of Array.from(sheet.querySelectorAll("img"))){
   if(!image.complete)await new Promise<void>(resolve=>{image.addEventListener("load",()=>resolve(),{once:true});image.addEventListener("error",()=>resolve(),{once:true})});
   if(!image.naturalWidth)image.hidden=true;
  }
  if(sheet.innerText.trim().length<10)throw Error("المستند فارغ");
  const clone=sheet.cloneNode(true) as HTMLElement;
  Object.assign(clone.style,{position:"fixed",left:"-10000px",top:"0",width:"794px",maxWidth:"none",minHeight:"1050px",margin:"0",boxSizing:"border-box",background:"#ffffff",color:"#20262b"});
  document.body.appendChild(clone);
  try{
   const canvas=await html2canvas(clone,{scale:2,backgroundColor:"#ffffff",logging:false,useCORS:true,windowWidth:1100});
   if(canvas.width===0||canvas.height===0)throw Error("تعذر تجهيز صفحة PDF");
   const sample=document.createElement("canvas");
   sample.width=64;sample.height=64;
   const context=sample.getContext("2d");
   if(!context)throw Error("تعذر فحص صفحة PDF");
   context.drawImage(canvas,0,0,64,64);
   const pixels=context.getImageData(0,0,64,64).data;
   let marked=0;
   for(let p=0;p<pixels.length;p+=4)if(pixels[p]<245||pixels[p+1]<245||pixels[p+2]<245)marked++;
   if(marked<20)throw Error("تعذر إنشاء PDF: الصفحة فارغة");
   if(i)pdf.addPage();
   const width=Math.min(190,277*canvas.width/canvas.height),height=width*canvas.height/canvas.width;
   pdf.addImage(canvas.toDataURL("image/jpeg",0.94),"JPEG",(210-width)/2,10,width,height);
   pdf.setFontSize(9);pdf.text(String(i+1)+" / "+sheets.length,105,291,{align:"center"});
  }finally{clone.remove();}
 }
 const blob=pdf.output("blob");if(blob.size<=3000)throw Error("تعذر إنشاء PDF: الصفحة فارغة");if(download)await accountingDownload(blob,filename+".pdf");return blob;
}
