import { useMemo, useState } from "react";
import { getDefaultModelForProvider, PROVIDER_LABELS, type ProviderId } from "@/lib/providers";
import { DEFAULT_PROXY_URL } from "@/lib/proxy";
import { Info } from "lucide-react";

export interface ApiKeyFormValues {
  name: string;
  key: string;
  provider: string;
  model: string;
  useProxy: boolean;
  proxyUrl: string;
}

interface ApiKeyFormProps {
  initialValues: ApiKeyFormValues;
  onCancel?: () => void;
  onSubmit: (values: ApiKeyFormValues) => void;
  submitLabel: string;
}

export function ApiKeyForm({ initialValues, onCancel, onSubmit, submitLabel }: ApiKeyFormProps) {
  const [values, setValues] = useState<ApiKeyFormValues>(initialValues);
  const [showProxyInfo, setShowProxyInfo] = useState(false);

  const providerOptions = useMemo(
    () => Object.entries(PROVIDER_LABELS) as Array<[ProviderId, string]>,
    []
  );

  function updateProvider(provider: string) {
    setValues((current) => ({
      ...current,
      provider,
      model:
        !current.model || current.model === getDefaultModelForProvider(current.provider)
          ? getDefaultModelForProvider(provider)
          : current.model,
    }));
  }

  function handleSubmit() {
    if (!values.name.trim() || !values.key.trim() || !values.model.trim()) return;
    onSubmit({
      name: values.name.trim(),
      key: values.key.trim(),
      provider: values.provider,
      model: values.model.trim(),
      useProxy: values.useProxy,
      proxyUrl: values.proxyUrl.trim() || DEFAULT_PROXY_URL,
    });
  }

  return (
    <div className="p-3 rounded-lg border border-border space-y-2">
      <input
        type="text"
        value={values.name}
        onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        placeholder="Key name"
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        value={values.provider}
        onChange={(event) => updateProvider(event.target.value)}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {providerOptions.map(([provider, label]) => (
          <option key={provider} value={provider}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={values.model}
        onChange={(event) => setValues((current) => ({ ...current, model: event.target.value }))}
        placeholder="Model"
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="password"
        value={values.key}
        onChange={(event) => setValues((current) => ({ ...current, key: event.target.value }))}
        placeholder="API Key"
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values.useProxy}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  useProxy: event.target.checked,
                  proxyUrl: current.proxyUrl || DEFAULT_PROXY_URL,
                }))
              }
            />
            Use proxy
          </label>
          <button
            type="button"
            onClick={() => setShowProxyInfo((current) => !current)}
            className="p-1 rounded-full hover:bg-accent text-muted-foreground"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        {showProxyInfo && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Some LLM providers block direct browser calls with CORS, so the request never reaches the API.</p>
            <p>A proxy forwards the request from your own server, which bypasses browser CORS checks.</p>
            <p>Only use a proxy you trust, because it can see your API key and request content.</p>
          </div>
        )}
        {values.useProxy && (
          <input
            type="text"
            value={values.proxyUrl}
            onChange={(event) => setValues((current) => ({ ...current, proxyUrl: event.target.value }))}
            placeholder={DEFAULT_PROXY_URL}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!values.name.trim() || !values.key.trim() || !values.model.trim()}
          className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
