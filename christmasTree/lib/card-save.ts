type FileShare = {canShare?:(data:ShareData)=>boolean;share?:(data:ShareData)=>Promise<void>};
export function canShareImage(navigator:FileShare,file:File):boolean {
  try {return typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files:[file]});}
  catch{return false;}
}
// Call directly in the tap handler: awaiting image conversion would lose user activation.
export async function shareImage(navigator:FileShare,file:File):Promise<"shared"|"cancelled"|"fallback"> {
  if(!canShareImage(navigator,file))return "fallback";
  try {await navigator.share!({files:[file]});return "shared";}
  catch(error){return (error as {name?:string}).name==="AbortError"?"cancelled":"fallback";}
}
