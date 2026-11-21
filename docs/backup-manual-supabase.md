# Backup manual do VendlySys — antes de testes em produção

Projeto Supabase: `gzhhapdxrtzxhrhfxweg` (`vendlysys-prod`).

> **IMPORTANTE:** plano Free não inclui backups automáticos. Este procedimento ainda não foi executado. Não aplicar migrações RLS ou gatilhos em produção até validar um backup restaurável.

## Pré-requisitos

- Supabase CLI e Docker instalados em um ambiente confiável.
- Acesso autorizado ao projeto e à senha do banco, sem colocar credenciais no GitHub, Vercel ou em conversas.
- Conferir a documentação oficial: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Exportar

Em um terminal local seguro, autentique o CLI (`supabase login`) e vincule o projeto (`supabase link --project-ref gzhhapdxrtzxhrhfxweg`). O CLI pode solicitar a senha do banco.

```bash
mkdir -p backups
supabase db dump --linked -f backups/roles.sql --role-only
supabase db dump --linked -f backups/schema.sql
supabase db dump --linked -f backups/data.sql --data-only --use-copy
```

**Não versionar os arquivos de backup.** Eles podem conter informações pessoais. Guardar em local criptografado e de acesso restrito.

## Limitações e verificação

- O dump padrão não substitui um backup de Auth e Storage. Conferir separadamente usuários de autenticação, objetos do Storage, configurações do projeto, secrets e Edge Functions.
- Verificar que os três arquivos existem, têm conteúdo e não apresentam erros de exportação.
- Restaurar em PostgreSQL isolado compatível e validar tabelas, chaves, RLS, contagens e fluxos antes de considerar o backup recuperável.
- Não testar restauração diretamente sobre o projeto de produção.
- Não criar registros fictícios no banco real antes da validação.

## Próxima etapa

Somente após a verificação do backup: testes transacionais controlados, com reversão, e aplicação gradual das correções de RLS.
