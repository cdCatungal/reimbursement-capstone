import sequelize from '../config/db.js';
import { User, SapCode, UserSapCode } from '../models/index.js';

async function migrateToMultiSapCode() {
  console.log('🔄 Starting migration to multi-SAP code system...');
  
  try {
    // 1. Create new tables
    console.log('📊 Creating new tables...');
    await UserSapCode.sync({ force: false });
    
    // 2. Add new columns to existing tables
    console.log('➕ Adding new columns...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS assigned_sul_id INTEGER REFERENCES users(id);
    `);
    
    await sequelize.query(`
      ALTER TABLE sap_codes 
      ADD COLUMN IF NOT EXISTS account_manager_id INTEGER REFERENCES users(id);
    `);
    
    // 3. Migrate existing SAP codes from users to junction table
    console.log('🔀 Migrating existing SAP codes...');
    const users = await User.findAll({
      where: {
        role: 'Employee'
      }
    });
    
    for (const user of users) {
      // Migrate sap_code_1
      if (user.sap_code_1) {
        const sapCode = await SapCode.findOne({ where: { code: user.sap_code_1 } });
        if (sapCode) {
          await UserSapCode.findOrCreate({
            where: {
              user_id: user.id,
              sap_code_id: sapCode.id
            }
          });
          console.log(`  ✅ Migrated ${user.name}: ${user.sap_code_1}`);
        }
      }
      
      // Migrate sap_code_2
      if (user.sap_code_2) {
        const sapCode = await SapCode.findOne({ where: { code: user.sap_code_2 } });
        if (sapCode) {
          await UserSapCode.findOrCreate({
            where: {
              user_id: user.id,
              sap_code_id: sapCode.id
            }
          });
          console.log(`  ✅ Migrated ${user.name}: ${user.sap_code_2}`);
        }
      }
    }
    
    // 4. Clear old SAP codes from SULs (they shouldn't have any)
    console.log('🧹 Clearing SAP codes from SULs...');
    await User.update(
      { sap_code_1: null, sap_code_2: null },
      { where: { role: 'SUL' } }
    );
    
    console.log('✅ Migration completed successfully!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Test the new system thoroughly');
    console.log('2. Once confirmed working, manually drop old columns:');
    console.log('   ALTER TABLE users DROP COLUMN sap_code_1;');
    console.log('   ALTER TABLE users DROP COLUMN sap_code_2;');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateToMultiSapCode()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });