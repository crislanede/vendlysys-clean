# Recuperação de MFA — VendlySys (especificação de implementação)

Status: **planejado, não habilitado**. Nunca remover MFA apenas por redefinição de senha.

## Perfis
- Usuário comum: recuperação pelo e-mail principal previamente verificado + reautenticação por senha, com limites e auditoria. Avaliar risco de bypass de MFA.
- Admin de empresa: acima + aprovação de outro administrador autorizado **da mesma empresa**, com sessão MFA AAL2. O aprovador não pode ser o solicitante.
- Super admin/admin SaaS: acima + aprovação de outro super admin independente com MFA AAL2; impedir aprovação cruzada entre perfis de privilégio menor.
- Se não houver aprovador independente, **não** permitir bypass automático; exigir procedimento de contingência de alta confiança, definido antes do lançamento.

## Estados e backend
1. Solicitação autenticada em AAL1 após senha, vinculada ao auth.uid() (não aceitar user_id arbitrário do navegador).
2. Edge Function privilegiada verifica perfil e vínculos no servidor. Gera token criptograficamente aleatório de uso único; persiste apenas hash, TTL 10 min, tentativas e estado pendente. Envio ao e-mail verificado da conta via provedor transacional.
3. Verificação do token e reautenticação recente da senha. Para administradores, criar aprovação pendente vinculada ao usuário e à empresa; notificar aprovador predefinido. Exigir autenticação AAL2 do aprovador.
4. Apenas após todos os requisitos, operação administrativa no servidor revoga fatores TOTP antigos usando API de administração do Auth; nunca expor service_role no browser. Invalidar sessões existentes; obrigar novo cadastro TOTP e sua verificação antes de qualquer acesso protegido.
5. Auditoria imutável: solicitante, aprovador, empresa, fator removido, timestamps, resultado, origem e motivo. Notificar por e-mail após a conclusão.
6. Impedir enumeração de e-mails, aplicar rate limit por usuário/IP, limitar tentativas, proteger contra replay, concorrência e mudanças de aprovador durante solicitação.

## Antes de ativar
- Confirmar API de administração disponível para remoção de fatores e revogação de sessões na versão do Supabase em uso.
- Implementar políticas RLS e controle de acesso no servidor; testes para admin cruzando empresa, aprovação própria, token expirado/reutilizado, reset de senha, usuário sem aprovador e sessão AAL1.
- Configurar envio de e-mails, templates e URL permitida; validar build, integração e fluxo completo em ambiente de teste.
- Não criar endpoints que retornem tokens ou segredos em logs.

Referências:
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/reference/javascript/auth-mfa
- https://pages.nist.gov/800-63-4/sp800-63b.html
