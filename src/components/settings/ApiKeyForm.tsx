import { useMemo, useState } from "react";
import { getDefaultModelForProvider, PROVIDER_LABELS, type ProviderId } from "@/lib/providers";

interface ApiKeyFormValues {
  name: string;
  key: string;
  provider: string;
  model: string;
}

interface ApiKeyFormProps {
  initialValues: ApiKeyFormValues;
  onCancel?: () => void;
  onSubmit: (values: ApiKeyFormValues) => void;
  submitLabel: string;
}

export function ApiKeyForm({ initialValues, onCancel, onSubmit, submitLabel }: ApiKeyFormProps) {
  const [values, setValues] = useState<ApiKeyFormValues>(initialValues);

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
