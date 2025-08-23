# 🔒 Database Backup System

Dette systemet beskytter databasen din mot dataf tap ved å automatisk lage backups før sletting og gi enkle restore-muligheter.

## 🎯 Hovedfunksjoner

- **Automatisk backup** før alle slette-operasjoner
- **Manuell backup** når du trenger det
- **Enkel restore** fra siste backup
- **Emergency restore** ved kritiske problemer
- **Sikker sletting** med automatisk backup

## 📋 Tilgjengelige Scripts

### 🔧 Backup Operasjoner

```bash
# Lag manuell backup nå
npx ts-node -r tsconfig-paths/register scripts/backup-now.ts

# Test at backup-systemet fungerer
npx ts-node -r tsconfig-paths/register scripts/test-backup-system.ts
```

### 🔄 Restore Operasjoner

```bash
# Gjenopprett fra siste backup
npx ts-node -r tsconfig-paths/register scripts/restore-latest.ts

# Emergency restore (ved kritiske problemer)
npx ts-node -r tsconfig-paths/register scripts/emergency-restore.ts
```

### 🛡️ Sikker Sletting

```bash
# Slett produkter på en sikker måte (med automatisk backup)
npx ts-node -r tsconfig-paths/register scripts/safe-delete-products.ts
```

## 📊 Backup Status

**Siste Test:** ✅ Alle tester bestått
- Produkter: 41 
- Kategorier: 5
- Bilder: 169
- Brukere: 1

## 🔥 Emergency Procedures

### Ved Datap tøp
1. **IKKE PANIKK** - backups er tilgjengelige
2. Kjør emergency restore:
   ```bash
   npx ts-node -r tsconfig-paths/register scripts/emergency-restore.ts
   ```
3. Verifiser at dataene er tilbake

### Før Farlige Operasjoner
1. Lag alltid backup først:
   ```bash
   npx ts-node -r tsconfig-paths/register scripts/backup-now.ts
   ```
2. Bruk sikre scripts i stedet for direkte SQL
3. Test på en liten mengde data først

## 📁 Backup Lokasjon

Backups lagres i: `/backups/`
- Format: `backup_[timestamp]_[reason].json`
- Automatisk cleanup: Beholder siste 15 backups
- Inkluderer: Produkter, kategorier, bilder, brukere, homepage configs

## 🚨 Viktige Regler

1. **Aldri slett uten backup** - Bruk `safeDeleteProducts()` funksjonen
2. **Test restore** jevnlig for å sikre at backups fungerer
3. **Ikke slett backup-filer** manuelt
4. **Kjør backup før store endringer** i produksjon

## 🔧 API Usage

```typescript
import { backupService } from '../src/utils/backupService';

// Lag backup
const backupPath = await backupService.createBackup('before_migration');

// Sikker sletting med automatisk backup
const deletedCount = await backupService.safeDeleteProducts({
  name: { in: ['Test Product'] }
}, 'cleanup');

// Emergency restore
await backupService.emergencyRestore();
```

## 📈 Monitoring

Backup-systemet logger alle operasjoner til console og app.log:
- ✅ Vellykkede backups
- 🔄 Restore operasjoner  
- ❌ Feil og problemer
- 📊 Statistikk over backup-innhold

## 💡 Best Practices

1. **Daglig backup** i produksjon
2. **Test restore** månedlig
3. **Verifiser backup-innhold** før kritiske operasjoner
4. **Bruk descriptive reasons** for backups (f.eks. "before_product_migration")
5. **Monitor backup-størrelse** for å oppdage problemer tidlig