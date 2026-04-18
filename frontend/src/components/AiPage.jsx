import WorkspaceTopBar from './WorkspaceTopBar'

function AiPage({ topBarProps, onAskAi, aiPrompt, setAiPrompt, aiChatBusy, aiChatError, aiReply }) {
  return (
    <main className="crm">
      <WorkspaceTopBar {...topBarProps} />

      <header className="subpage-top panel">
        <h1>Ask AI</h1>
        <p className="muted-text">Chat with your local CRM assistant in a dedicated page.</p>
      </header>

      <section className="panel">
        <h2>Local AI Assistant (Ollama)</h2>
        <form className="ai-chat-form" onSubmit={onAskAi}>
          <label>
            Ask for help with follow-up strategy, risk review, or message drafting
            <textarea
              rows="4"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="Example: Draft a follow-up email for high-value leads stuck in negotiation"
            />
          </label>
          <button className="cta" disabled={aiChatBusy} type="submit">
            {aiChatBusy ? 'Thinking...' : 'Ask Local AI'}
          </button>
        </form>
        {aiChatError && <p className="error">{aiChatError}</p>}
        {aiReply && (
          <article className="ai-reply">
            <h3>Assistant Reply</h3>
            <p>{aiReply}</p>
          </article>
        )}
      </section>
    </main>
  )
}

export default AiPage
