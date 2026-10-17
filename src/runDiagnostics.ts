import {runEncryptionDiagnostics} from './encryptionDiagnostics';
import {validAmount} from './accountingDomain';
async function main(){
 const result=await runEncryptionDiagnostics();
 if(!Object.values(result).every(Boolean))throw new Error('Encryption diagnostics failed: '+JSON.stringify(result));
 if(!validAmount(100)||validAmount(-1)||validAmount(Number.NaN))throw new Error('Amount checks failed');
 console.log('Accounting preview checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
