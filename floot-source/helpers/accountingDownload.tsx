import {Capacitor} from "@capacitor/core";
export async function accountingDownload(blob:Blob,filename:string){
 if(Capacitor.isNativePlatform()){
  const [{Filesystem,Directory},{Share}]=await Promise.all([import("@capacitor/filesystem"),import("@capacitor/share")]);
  const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(blob);});
  const saved=await Filesystem.writeFile({path:filename.replace(/[^a-zA-Z0-9._-]/g,"_"),data,directory:Directory.Cache});
  await Share.share({title:"أرتك المحاسبي",files:[saved.uri],dialogTitle:"حفظ أو مشاركة الملف"});
 }else{
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
}
