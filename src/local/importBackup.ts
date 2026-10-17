import {Preferences} from '@capacitor/preferences';
import {nativeBackend} from './native';
import {database,migrate} from './database';
import {restoreIntoEmpty} from './backup';
// Restore into a new encrypted database; switch only after all integrity checks pass.
export async function activateRestoredBackup(value:unknown){const name='artk_import_'+crypto.randomUUID().replaceAll('-','');const backend=await nativeBackend(name);const db=database(backend);try{await migrate(backend);await restoreIntoEmpty(db,value)}finally{await db.destroy()}await Preferences.set({key:'artk.active.ledger',value:name});}
