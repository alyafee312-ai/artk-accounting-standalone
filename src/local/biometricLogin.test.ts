import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({prefs:new Map<string,string>(),credentials:null as null|{username:string;password:string},savedOptions:null as any}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:vi.fn(async({key})=>({value:state.prefs.get(key)||null}))}}));
vi.mock('@capgo/capacitor-native-biometric',()=>({AccessControl:{BIOMETRY_CURRENT_SET:2},NativeBiometric:{deleteCredentials:vi.fn(async()=>{state.credentials=null}),isAvailable:vi.fn(async()=>({isAvailable:true})),isCredentialsSaved:vi.fn(async()=>({isSaved:!!state.credentials})),setCredentials:vi.fn(async options=>{state.credentials={username:options.username,password:options.password};state.savedOptions=options}),getSecureCredentials:vi.fn(async()=>{if(!state.credentials)throw Error('not enrolled');return state.credentials})}}));
import {biometricReady,biometricServer,enrollBiometric,loginBiometric} from './biometricLogin';
import {database,migrate} from './database';
import {testBackend} from './sqljs';
import {authenticate,initializeAdmin,Ledger} from './service';
beforeEach(()=>{state.prefs.clear();state.credentials=null;state.savedOptions=null});
describe('Alternative biometric/password login',()=>{
 it('uses password alone without biometric enrollment',async()=>{const env=await testBackend();await migrate(env.backend);const db=database(env.backend);await initializeAdmin(db,'example-password');expect((await authenticate(db,'admin','example-password')).role).toBe('admin');expect(state.savedOptions).toBeNull();expect(await biometricReady('admin')).toBe(false);await db.destroy()});
 it('unlocks using protected credentials without a second password entry and rejects revoked accounts',async()=>{const env=await testBackend();await migrate(env.backend);const db=database(env.backend);await initializeAdmin(db,'example-password');await enrollBiometric('admin','example-password');expect(state.savedOptions.authValidityDuration).toBe(0);expect(state.savedOptions.accessControl).toBe(2);expect(await biometricReady('admin')).toBe(true);expect((await loginBiometric(db,'admin')).role).toBe('admin');await db.updateTable('users').set({disabledAt:new Date()}).where('id','=',1).execute();await expect(loginBiometric(db,'admin')).rejects.toThrow();await db.destroy()});
 it('binds biometric storage to account and active database',async()=>{const first=await biometricServer('admin');expect(await biometricServer('ADMIN')).toBe(first);expect(await biometricServer('employee')).not.toBe(first);state.prefs.set('artk.active.ledger','restored-ledger');expect(await biometricServer('admin')).not.toBe(first)});
});
