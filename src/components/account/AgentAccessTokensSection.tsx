'use client';

import { useMemo, useState } from 'react';
import { Bot, Copy, KeyRound, Trash2 } from 'lucide-react';
import type { ApiTokenScope, ApiTokenSummary } from '@/types/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AgentAccessTokensSectionProps = {
  initialTokens: ApiTokenSummary[];
};

type CreateTokenResponse = {
  apiToken: ApiTokenSummary;
  token: string;
};

const TOKEN_SCOPE_OPTIONS: Array<{
  value: ApiTokenScope;
  label: string;
  description: string;
}> = [
  {
    value: 'read_intel',
    label: 'Intel only',
    description: 'Public intel feeds and MCP snapshot/search/feed/map tools.',
  },
  {
    value: 'read_network',
    label: 'Network read',
    description: 'Adds network status reads for member agents.',
  },
  {
    value: 'use_network',
    label: 'Network write',
    description: 'Adds network messaging and control-capable agent access.',
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AgentAccessTokensSection({ initialTokens }: AgentAccessTokensSectionProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState('Codex MCP');
  const [scope, setScope] = useState<ApiTokenScope>('read_intel');
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<CreateTokenResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const activeCount = useMemo(
    () => tokens.filter((token) => !token.revokedAt).length,
    [tokens],
  );

  async function handleCreateToken() {
    setIsCreating(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch('/api/me/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, scope }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create token.');
      }

      const result = payload as CreateTokenResponse;
      setTokens((current) => [result.apiToken, ...current]);
      setCreatedToken(result);
      setName('Codex MCP');
      setScope('read_intel');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create token.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevokeToken(id: string) {
    setRevokingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/me/tokens/${id}/revoke`, {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to revoke token.');
      }

      setTokens((current) =>
        current.map((token) =>
          token.id === id
            ? {
                ...token,
                revokedAt: payload.revokedAt ?? new Date().toISOString(),
              }
            : token,
        ),
      );
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke token.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopyToken() {
    if (!createdToken?.token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdToken.token);
      setCopied(true);
    } catch {
      setCopied(false);
      setError('Copy failed. You can still select and copy the token manually.');
    }
  }

  return (
    <section className="border border-border rounded">
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-semibold">Agent access tokens</h3>
          <Badge variant="outline">{activeCount} active</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Create scoped tokens for MCP clients and agent skills. The plaintext token is shown once.
        </p>
      </div>

      <div className="px-4 py-3 space-y-4">
        {error && (
          <Alert tone="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {createdToken && (
          <Alert tone="success">
            <AlertDescription className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>New token created. Store it now because it will not be shown again.</span>
              </div>
              <div className="rounded border border-border bg-muted/30 p-3 font-mono text-xs break-all">
                {createdToken.token}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleCopyToken}>
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copied' : 'Copy token'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Use this as `BIG_BOSS_API_TOKEN` in your MCP client config.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="token-name" className="text-xs">Token label</Label>
            <Input
              id="token-name"
              value={name}
              maxLength={48}
              onChange={(event) => setName(event.target.value)}
              placeholder="Codex MCP"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token-scope" className="text-xs">Scope</Label>
            <select
              id="token-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as ApiTokenScope)}
              className="h-10 w-full rounded border border-input bg-background px-3 text-sm"
            >
              {TOKEN_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {TOKEN_SCOPE_OPTIONS.find((option) => option.value === scope)?.description}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleCreateToken}
            disabled={isCreating || name.trim().length < 2}
          >
            {isCreating ? 'Creating…' : 'Create token'}
          </Button>
        </div>

        <div className="overflow-hidden rounded border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No agent access tokens yet.
                  </TableCell>
                </TableRow>
              ) : (
                tokens.map((token) => {
                  const revoked = Boolean(token.revokedAt);

                  return (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell className="font-mono text-xs">{token.tokenPrefix}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{token.scope}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(token.lastUsedAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(token.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={revoked ? 'secondary' : 'success'}>
                          {revoked ? 'revoked' : 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={revoked || revokingId === token.id}
                          onClick={() => handleRevokeToken(token.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {revokingId === token.id ? 'Revoking…' : 'Revoke'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
