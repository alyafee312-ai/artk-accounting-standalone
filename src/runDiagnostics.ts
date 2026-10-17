import {runEncryptionDiagnostics} from './encryptionDiagnostics';
import {validAmount} from './accountingDomain';
export async function runPreviewDiagnostics():Promise<boolean>{
 const result=await runEncryptionDiagnostics();
 if(!Object.values(result).every(Boolean))throw new Error('Encryption diagnostics failed: '+JSON.stringify(result));
 if(!validAmount(100)||validAmount(-1)||validAmount(Number.NaN))throw new Error('Amount checks failed');
 return true;
}
