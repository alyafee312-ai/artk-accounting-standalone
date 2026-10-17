import {NativeBiometric,AccessControl} from '@capgo/capacitor-native-biometric';
import {Preferences} from '@capacitor/preferences';
import {sha256} from './sha256';
import type {Kysely} from 'kysely';
import {authenticate} from './service';
export async function biometricServer(email:string){const database=(await Preferences.get({key:'artk.active.ledger'})).value||'artk_ledger';return 'artk-login-'+await sha256(database+':'+email.trim().toLowerCase())}
export async function biometricReady(email:string){try{return (await NativeBiometric.isAvailable()).isAvailable&&(await NativeBiometric.isCredentialsSaved({server:await biometricServer(email)})).isSaved}catch{return false}}
export async function enrollBiometric(email:string,password:string){await NativeBiometric.setCredentials({server:await biometricServer(email),username:email.trim().toLowerCase(),password,accessControl:AccessControl.BIOMETRY_CURRENT_SET,authValidityDuration:0,title:'تفعيل الدخول بالبصمة',negativeButtonText:'إلغاء'})}
export async function loginBiometric(db:Kysely<any>,email:string){const server=await biometricServer(email);const credentials=await NativeBiometric.getSecureCredentials({server,title:'الدخول إلى أرتك',negativeButtonText:'استخدام كلمة المرور'});if(credentials.username!==email.trim().toLowerCase())throw Error('الحساب لا يطابق البصمة المحفوظة');try{return await authenticate(db,credentials.username,credentials.password)}catch(error){await NativeBiometric.deleteCredentials({server}).catch(()=>{});throw error}}
