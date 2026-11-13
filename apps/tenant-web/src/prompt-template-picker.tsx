import { useState } from 'react';
import { Btn, Field, Input, Select, Textarea } from './ui';
import { buildPromptFromTemplate, PROMPT_TEMPLATES, type TemplateFieldKey } from './prompt-templates';

/** Standalone so both pages.tsx and extra-pages.tsx can import it without a
 * circular dependency (extra-pages.tsx already imports from pages.tsx). */
export function PromptTemplatePicker({ onGenerate }: { onGenerate: (text: string) => void }) {
  const [templateId, setTemplateId] = useState('');
  const [values, setValues] = useState<Record<TemplateFieldKey, string>>({} as Record<TemplateFieldKey, string>);
  const [open, setOpen] = useState(false);

  const template = PROMPT_TEMPLATES.find((t) => t.id === templateId) ?? null;

  function selectTemplate(id: string) {
    setTemplateId(id);
    const t = PROMPT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    const initial = {} as Record<TemplateFieldKey, string>;
    for (const f of t.fields) initial[f.key] = f.defaultValue ?? '';
    setValues(initial);
  }

  return (
    <div className="mb-5 rounded-xl border border-dashed border-input p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
      >
        <div>
          <h4 className="text-sm font-semibold text-foreground">Start from a template</h4>
          <p className="text-xs text-muted-foreground">
            Pick an industry, fill in a few details, and we'll write the full prompt for you.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4">
          <Field label="Use case">
            <Select value={templateId} onChange={(e) => selectTemplate(e.target.value)}>
              <option value="">— choose a use case —</option>
              {PROMPT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          {template && (
            <>
              <p className="-mt-2 text-xs text-muted-foreground">{template.description}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {template.fields.map((f) => (
                  <div key={f.key} className={f.multiline ? 'sm:col-span-2' : ''}>
                    <Field label={f.label}>
                      {f.multiline ? (
                        <Textarea
                          rows={2}
                          value={values[f.key] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      ) : (
                        <Input
                          value={values[f.key] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      )}
                    </Field>
                  </div>
                ))}
              </div>
              <div>
                <Btn
                  type="button"
                  onClick={() => onGenerate(buildPromptFromTemplate(template, values))}
                  disabled={!values.companyName?.trim()}
                >
                  Generate prompt
                </Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
