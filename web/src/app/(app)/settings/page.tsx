import TokenPanel from "@/components/TokenPanel";
import OpenRouterSettingsForm from "@/components/OpenRouterSettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-10 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Configure the extension connection and the LLM used to generate summaries.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Extension API token</h2>
        <p className="text-sm text-black/60 dark:text-white/60 mb-3">
          Paste this into the extension&rsquo;s options page along with this site&rsquo;s URL so it
          can submit highlights here.
        </p>
        <TokenPanel />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">OpenRouter</h2>
        <p className="text-sm text-black/60 dark:text-white/60 mb-3">
          Get an API key at{" "}
          <a href="https://openrouter.ai/keys" className="underline" target="_blank" rel="noreferrer">
            openrouter.ai/keys
          </a>
          . Leave blank to keep using the <code>OPENROUTER_API_KEY</code> environment variable.
        </p>
        <OpenRouterSettingsForm />
      </section>
    </div>
  );
}
