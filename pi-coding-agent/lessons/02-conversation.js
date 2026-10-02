window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── roles
  {
    id: 'roles',
    section: 'Conversation: user & assistant',
    title: 'Roles: system, user, assistant',
    explain: `
      <p>A conversation sent to a model is a list of <strong>messages</strong>. Each message
      has a <strong>role</strong> that says who "spoke" it:</p>
      <ul>
        <li><strong>system</strong>: the app's instructions (last lesson). Usually one, at the
        start.</li>
        <li><strong>user</strong>: what the human (or the harness on their behalf) says.</li>
        <li><strong>assistant</strong>: what the model replied earlier.</li>
      </ul>
      <p>Later you'll meet a fourth kind, the <strong>tool result</strong> (the harness
      reporting what a tool returned). For now: system, user, assistant.</p>

      <h3>Content blocks</h3>
      <p>Content can be a plain string, but modern APIs use an array of <strong>content
      blocks</strong>, each with a <code>type</code>. This allows mixing text, images,
      thinking and tool calls in one message. In pi's AI library
      (<code>@earendil-works/pi-ai</code>), the shapes look like this (simplified):</p>
      <pre><code>// user: string OR array of text/image blocks
{ role: 'user', content: 'Fix the bug', timestamp: 1718000000000 }
{ role: 'user', content: [{ type: 'text', text: 'What is in this screenshot?' },
                          { type: 'image', data: '&lt;base64&gt;', mimeType: 'image/png' }] }

// assistant: always an array of blocks (text, thinking, toolCall)
{ role: 'assistant',
  content: [{ type: 'text', text: 'The bug is on line 12.' }],
  provider: 'anthropic', model: '...', usage: { input: 812, output: 9, ... },
  stopReason: 'stop' }</code></pre>
      <p>pi-ai keeps the system prompt as a separate <code>systemPrompt</code> string in the
      request context rather than as a message in the array.</p>

      <div class="tip">Real formats differ by provider. Anthropic puts <code>system</code> at the
      top level and uses content blocks. OpenAI's Chat Completions uses a
      <code>system</code>/<code>developer</code> message and string or part arrays. pi-ai
      <strong>normalizes</strong> all of them into one shape, so pi's agent code doesn't care
      which provider you picked.</div>
      <div class="warn">The assistant messages in the history are just data. The harness could
      edit them, and the model would believe it said that. Harnesses must record them
      faithfully.</div>
    `,
    examples: [
      {
        title: 'Build a messages array and render a chat timeline',
        code: `// Message shapes modeled on pi-ai (simplified: no timestamps, usage, etc.)
const systemPrompt = 'You are a helpful coding assistant.';

const messages = [
  { role: 'user', content: 'What does git stash do?' },
  {
    role: 'assistant',
    content: [{ type: 'text', text: 'It saves uncommitted changes and cleans your tree.' }],
  },
  {
    role: 'user',
    content: [{ type: 'text', text: 'How do I get them back?' }],
  },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: 'Run ' },
      { type: 'text', text: 'git stash pop.' },
    ],
  },
];

// Content can be a string or an array of blocks → normalize to text
function textOf(msg) {
  if (typeof msg.content === 'string') return msg.content;
  return msg.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
}

console.log('system:', systemPrompt);
messages.forEach((m, i) => {
  const shape = typeof m.content === 'string' ? 'string' : m.content.length + ' block(s)';
  console.log(i + ' ' + m.role.padEnd(9) + '[' + shape + '] ' + textOf(m));
});

const bubble = m => {
  const mine = m.role === 'user';
  return '<div style="display:flex;justify-content:' + (mine ? 'flex-end' : 'flex-start') +
    '"><div style="max-width:70%;margin:4px;padding:8px 12px;border-radius:12px;background:' +
    (mine ? '#6366f1;color:white' : '#f1f5f9') + '"><small style="opacity:.7">' + m.role +
    '</small><br>' + textOf(m) + '</div></div>';
};

document.getElementById('root').innerHTML =
  '<div style="text-align:center;font-size:12px;color:gray;margin-bottom:6px">⚙ system: ' +
  systemPrompt + '</div>' + messages.map(bubble).join('');`,
      },
      {
        title: 'One conversation, two provider formats',
        explain: `
          <details>
            <summary>Why a normalization layer?</summary>
            <p>The same chat must be sent in different JSON shapes depending on the provider.
            This toy converts one pi-ai-style context into simplified Anthropic Messages and
            OpenAI Chat Completions request bodies. Compare the two logged JSON objects:</p>
            <table>
              <tr><th></th><th>Anthropic (simplified)</th><th>OpenAI Chat (simplified)</th></tr>
              <tr><td>System prompt</td><td>top-level <code>system</code> field</td>
                <td>first message with <code>role: "system"</code></td></tr>
              <tr><td>Content</td><td>array of <code>{ type: "text", text }</code> blocks</td>
                <td>plain string</td></tr>
            </table>
            <p>pi-ai does this (and much more: images, thinking, tool calls, usage) inside its
            provider adapters, so the rest of pi works with one format.</p>
          </details>
        `,
        code: `// One pi-ai-style context...
const context = {
  systemPrompt: 'Be brief.',
  messages: [
    { role: 'user', content: 'Hi!' },
    { role: 'assistant', content: [{ type: 'text', text: 'Hello! How can I help?' }] },
  ],
};

const textOf = m => typeof m.content === 'string' ? m.content :
  m.content.filter(b => b.type === 'text').map(b => b.text).join('');

// ...converted to two (simplified) provider wire formats
function toAnthropic(ctx) {
  return {
    system: ctx.systemPrompt,
    messages: ctx.messages.map(m => ({
      role: m.role,
      content: [{ type: 'text', text: textOf(m) }],
    })),
  };
}

function toOpenAIChat(ctx) {
  return {
    messages: [
      { role: 'system', content: ctx.systemPrompt },
      ...ctx.messages.map(m => ({ role: m.role, content: textOf(m) })),
    ],
  };
}

console.log('Anthropic-style:\\n' + JSON.stringify(toAnthropic(context), null, 2));
console.log('OpenAI-style:\\n' + JSON.stringify(toOpenAIChat(context), null, 2));`,
      },
    ],
    quiz: [
      {
        q: 'Which role holds the model’s earlier replies in the history?',
        options: ['system', 'user', 'assistant', 'model'],
        answer: 2,
        why: 'Previous model replies are stored and resent as assistant messages.',
      },
      {
        q: 'Why use content <em>blocks</em> instead of a plain string?',
        options: [
          'Strings are not allowed in JSON',
          'A message can mix different kinds of content: text, images, thinking, tool calls',
          'Blocks are cheaper',
          'Only for the system prompt',
        ],
        answer: 1,
        why: 'Each block has a type, so one assistant message can contain thinking + text + tool calls.',
      },
      {
        q: 'In pi-ai, where does the system prompt live in the request context?',
        options: [
          'As the last user message',
          'In a separate <code>systemPrompt</code> field next to <code>messages</code>',
          'Inside every assistant message',
          'It is not sent',
        ],
        answer: 1,
        why: 'pi-ai’s Context has systemPrompt, messages and tools; adapters map it to each provider.',
      },
      {
        q: 'What does <code>@earendil-works/pi-ai</code> do for pi regarding providers?',
        options: [
          'Trains models',
          'Normalizes different provider APIs into one message/content/streaming format',
          'Hosts a model server',
          'Stores API keys only',
        ],
        answer: 1,
        why: 'It’s pi’s unified LLM API: one shape for messages and events across Anthropic, OpenAI, Google and more.',
      },
    ],
    exercise: {
      task: `<p>Write <code>addUser(messages, text)</code> and
      <code>addAssistant(messages, text)</code>. <code>addUser</code> pushes a user message with
      a string content. <code>addAssistant</code> pushes an assistant message whose content is
      an array with one <code>{ type: 'text', text }</code> block. Then log each message as
      <code>role: text</code>. Expected output:</p>
      <pre><code>user: Hi
assistant: Hello!
user: Bye</code></pre>`,
      starter: `const messages = [];

function addUser(msgs, text) {
  // TODO
}

function addAssistant(msgs, text) {
  // TODO
}

const textOf = m => typeof m.content === 'string' ? m.content :
  m.content.filter(b => b.type === 'text').map(b => b.text).join('');

addUser(messages, 'Hi');
addAssistant(messages, 'Hello!');
addUser(messages, 'Bye');
messages.forEach(m => console.log(m.role + ': ' + textOf(m)));
console.log('count:', messages.length);`,
      hint: "msgs.push({ role: 'user', content: text }) and msgs.push({ role: 'assistant', content: [{ type: 'text', text }] }).",
      solution: `const messages = [];

function addUser(msgs, text) {
  msgs.push({ role: 'user', content: text });
}

function addAssistant(msgs, text) {
  msgs.push({ role: 'assistant', content: [{ type: 'text', text }] });
}

const textOf = m => typeof m.content === 'string' ? m.content :
  m.content.filter(b => b.type === 'text').map(b => b.text).join('');

addUser(messages, 'Hi');
addAssistant(messages, 'Hello!');
addUser(messages, 'Bye');
messages.forEach(m => console.log(m.role + ': ' + textOf(m)));
console.log('count:', messages.length);`,
    },
  },

  // ───────────────────────────────────────────────────────────── multi-turn
  {
    id: 'multi-turn',
    section: 'Conversation: user & assistant',
    title: 'The multi-turn conversation loop',
    explain: `
      <p>Put the last lessons together and you get the loop every chat app (and every agent)
      runs:</p>
      <ol>
        <li><strong>Append</strong> the user's message to <code>messages</code>.</li>
        <li><strong>Call</strong> the model with the <em>whole</em> array (+ system prompt).</li>
        <li><strong>Append</strong> the assistant's reply to <code>messages</code>.</li>
        <li><strong>Wait</strong> for the next user message and repeat.</li>
      </ol>
      <pre><code>while (true) {
  const text = await readUserInput();
  messages.push({ role: 'user', content: text });          // ①
  const reply = await model({ systemPrompt, messages });   // ②
  messages.push(reply);                                    // ③
  show(reply);
}</code></pre>
      <p>The array only grows. Call 1 sends 1 message, call 2 sends 3, call 3 sends 5, and so
      on: <code>2n - 1</code> messages on call <code>n</code>.</p>

      <div class="tip">In pi, this loop is the <strong>agent loop</strong>. pi adds your message
      to the session's active branch, builds a request from the system prompt, that branch,
      the tools and model settings, then records the streamed reply. The big difference you'll
      see later: if the reply asks for tools, pi runs them and calls the model <em>again</em>
      without waiting for you.</div>
      <div class="warn">Forgetting step ③ is a classic bug: the model never sees its own earlier
      answers, so it repeats itself or contradicts itself.</div>
    `,
    examples: [
      {
        title: 'Watch the messages array grow',
        explain: `
          <details>
            <summary>The problem: what exactly is sent on each call?</summary>
            <p>Beginners often picture the chat as "one message in, one message out". In
            reality, each call carries the <em>full</em> history. The console prints the roles
            sent on each call so you can see the growth.</p>
          </details>
          <details>
            <summary>Step by step: three turns</summary>
            <table>
              <tr><th>Turn</th><th>① push user</th><th>② call sends</th><th>③ push assistant</th>
                <th>Console</th></tr>
              <tr><td>1</td><td>length 1</td><td><code>[user]</code></td><td>length 2</td>
                <td><code>call 1 sends 1 msgs: user</code><br>
                <code>  → Nice! What do you want to know about your todo app?</code></td></tr>
              <tr><td>2</td><td>length 3</td><td><code>[user, assistant, user]</code></td>
                <td>length 4</td>
                <td><code>call 2 sends 3 msgs: user,assistant,user</code><br>
                <code>  → For a small todo app, SQLite is plenty.</code></td></tr>
              <tr><td>3</td><td>length 5</td>
                <td><code>[user, assistant, user, assistant, user]</code></td><td>length 6</td>
                <td><code>call 3 sends 5 msgs: user,assistant,user,assistant,user</code><br>
                <code>  → You're welcome! (I've seen 5 messages so far.)</code></td></tr>
            </table>
            <p>Last line: <code>final history length: 6</code>. Turn 2's answer mentions the
            <em>todo app</em> even though the question was only "Which database should I use?".
            The model could only know that from turn 1, which was resent.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Comment out <code>messages.push(reply)</code>. The counts become 1, 2, 3, and
              the roles are all <code>user</code>: the model never sees its own replies.</li>
              <li>Replace <code>fakeLLM(messages)</code> with
              <code>fakeLLM([messages[messages.length - 1]])</code>. Turn 2 loses the todo-app
              context and answers generically.</li>
            </ul>
          </details>
        `,
        code: `// A scripted fake model: answers depend ONLY on the array it receives
function fakeLLM(messages) {
  const all = messages.map(m => textOf(m)).join(' ');
  const last = textOf(messages[messages.length - 1]);

  let text = 'OK.';
  if (/building/i.test(last)) {
    text = 'Nice! What do you want to know about your todo app?';
  } else if (/database/i.test(last)) {
    text = /todo app/i.test(all) ? 'For a small todo app, SQLite is plenty.' :
      'It depends on your project. What are you building?';
  } else if (/thanks/i.test(last)) {
    text = "You're welcome! (I've seen " + messages.length + ' messages so far.)';
  }
  return { role: 'assistant', content: [{ type: 'text', text }] };
}

function textOf(m) {
  if (typeof m.content === 'string') return m.content;
  return m.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

const userInputs = [
  'Hi, I am building a todo app.',
  'Which database should I use?',
  'Thanks!',
];

const messages = [];
let call = 0;

for (const input of userInputs) {
  messages.push({ role: 'user', content: input });   // ① append user
  call++;
  console.log('call ' + call + ' sends ' + messages.length + ' msgs: ' +
    messages.map(m => m.role).join(','));
  const reply = fakeLLM(messages);                    // ② call with ALL messages
  console.log('  → ' + textOf(reply));
  messages.push(reply);                               // ③ append assistant
}
console.log('final history length:', messages.length);

document.getElementById('root').innerHTML = messages.map((m, i) =>
  '<div style="margin:3px 0;padding:6px 10px;border-radius:8px;background:' +
  (m.role === 'user' ? '#e0e7ff' : '#f1f5f9') + '"><small>#' + i + ' ' + m.role +
  '</small> ' + textOf(m) + '</div>').join('');`,
      },
    ],
    quiz: [
      {
        q: 'On the 4th call of a plain chat (no tools), how many messages are sent?',
        options: ['1', '4', '7', '8'],
        answer: 2,
        why: '3 earlier user+assistant pairs (6 messages) + the new user message = 7 (2n − 1).',
      },
      {
        q: 'What happens if the harness forgets to append the assistant reply?',
        options: [
          'Nothing, the provider stores it',
          'The model never sees its earlier answers and may repeat or contradict itself',
          'The API returns an error',
          'Cost goes up',
        ],
        answer: 1,
        why: 'Stateless API: if the reply isn’t in the array, it never happened for the model.',
      },
      {
        q: 'In pi, what does the model request contain?',
        options: [
          'Only the latest message',
          'The system prompt, the active branch’s messages, tool definitions and model settings',
          'Only the tool definitions',
          'A session ID the provider uses to look up history',
        ],
        answer: 1,
        why: 'Per pi’s “How Pi Works”: it builds the request from system prompt, active branch, tools and settings.',
      },
    ],
    exercise: {
      task: `<p>Write <code>chat(inputs)</code> that runs the loop for an array of user inputs
      and returns the <strong>number of messages sent on each call</strong> as an array. With
      4 inputs it should return <code>[1, 3, 5, 7]</code>.</p>`,
      starter: `function fakeLLM(messages) {
  return { role: 'assistant', content: [{ type: 'text', text: 'ok' }] };
}

function chat(inputs) {
  const messages = [];
  const sentCounts = [];
  // TODO: loop over inputs: push user, record messages.length, call, push reply
  return sentCounts;
}

console.log(chat(['a', 'b', 'c', 'd']));`,
      hint: 'for (const text of inputs) { messages.push({ role: "user", content: text }); sentCounts.push(messages.length); messages.push(fakeLLM(messages)); }',
      solution: `function fakeLLM(messages) {
  return { role: 'assistant', content: [{ type: 'text', text: 'ok' }] };
}

function chat(inputs) {
  const messages = [];
  const sentCounts = [];
  for (const text of inputs) {
    messages.push({ role: 'user', content: text });
    sentCounts.push(messages.length);
    messages.push(fakeLLM(messages));
  }
  return sentCounts;
}

console.log(chat(['a', 'b', 'c', 'd']));`,
    },
  },

  // ───────────────────────────────────────────────────────────── streaming
  {
    id: 'streaming',
    section: 'Conversation: user & assistant',
    title: 'Streaming responses',
    explain: `
      <p>A long answer can take many seconds to generate. Instead of waiting for the whole
      thing, APIs can <strong>stream</strong>: they send the reply as a series of small
      <strong>events</strong> while the model is still generating. The UI shows text as it
      arrives, so it <em>feels</em> fast.</p>
      <p>Analogy: a live sports ticker instead of tomorrow's newspaper.</p>

      <h3>pi-ai's event names</h3>
      <p>Each provider streams in its own format (Anthropic sends
      <code>content_block_delta</code> events, OpenAI sends chunks, ...). pi-ai turns them all
      into one event stream. A successful stream follows
      <code>start → updates* → done</code>:</p>
      <table>
        <tr><th>Event</th><th>Meaning</th></tr>
        <tr><td><code>start</code></td><td>stream begins (<code>partial</code> = message so far)</td></tr>
        <tr><td><code>text_start</code></td><td>a text block begins at <code>contentIndex</code></td></tr>
        <tr><td><code>text_delta</code></td><td>new chunk of text in <code>delta</code></td></tr>
        <tr><td><code>text_end</code></td><td>block complete; <code>content</code> = full text</td></tr>
        <tr><td><code>thinking_*</code>, <code>toolcall_*</code></td><td>same pattern for thinking and tool calls</td></tr>
        <tr><td><code>done</code></td><td>finished; <code>reason</code> (e.g. <code>stop</code>) and final <code>message</code></td></tr>
        <tr><td><code>error</code></td><td>failed or aborted (with the partial message)</td></tr>
      </table>
      <pre><code>for await (const event of models.stream(model, context)) {
  if (event.type === 'text_delta') process.stdout.write(event.delta);
}</code></pre>

      <div class="tip">Deltas are <em>pieces</em>, not the full text. To get the full text you
      concatenate them (or read the final message from <code>done</code>). pi's interactive
      mode renders these events live in the terminal; its JSON mode writes agent events as
      JSONL.</div>
      <div class="warn">Events from different blocks may be <strong>interleaved</strong>
      (e.g. a text delta, then a tool-call delta, then another text delta). pi-ai's docs say to
      use <code>contentIndex</code> to know which block an event belongs to.</div>
    `,
    examples: [
      {
        title: 'A fake stream with an async generator',
        explain: `
          <details>
            <summary>The problem: waiting for the full answer feels slow</summary>
            <p>Without streaming, the user stares at a blank screen until the last token is
            generated. With streaming, the first word appears after the first chunk. Here each
            chunk takes 120 ms, so the full reply takes about 1 second, but text starts
            appearing almost immediately.</p>
          </details>
          <details>
            <summary>Step by step: the exact event order</summary>
            <table>
              <tr><th>#</th><th>Event</th><th>Screen (root)</th><th>Console</th></tr>
              <tr><td>1</td><td><code>start</code></td><td>(empty)</td><td><code>start</code></td></tr>
              <tr><td>2</td><td><code>text_start</code> (index 0)</td><td>▌</td>
                <td><code>text_start [0]</code></td></tr>
              <tr><td>3</td><td><code>text_delta</code></td><td>Tokens ▌</td>
                <td><code>text_delta [0] "Tokens "</code></td></tr>
              <tr><td>4</td><td><code>text_delta</code></td><td>Tokens arrive ▌</td>
                <td><code>text_delta [0] "arrive "</code></td></tr>
              <tr><td>5–10</td><td><code>text_delta</code> × 6</td><td>…grows word by word</td>
                <td><code>"one "</code>, <code>"small "</code>, <code>"piece "</code>,
                <code>"at "</code>, <code>"a "</code>, <code>"time."</code></td></tr>
              <tr><td>11</td><td><code>text_end</code></td><td>full text, no cursor</td>
                <td><code>text_end [0] full: Tokens arrive one small piece at a time.</code></td></tr>
              <tr><td>12</td><td><code>done</code></td><td>✓ done (stop)</td>
                <td><code>done reason=stop</code></td></tr>
            </table>
            <p>Last line: <code>deltas received: 8</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>async function* fakeStream(text) {       // ①
  yield { type: 'text_delta', contentIndex: 0, delta, partial };   // ②
for await (const event of fakeStream(...)) {   // ③</code></pre>
            <ol>
              <li><strong>①</strong> <code>async function*</code> is an async generator: it can
              <code>await</code> (simulated network delay) and <code>yield</code> many values
              over time.</li>
              <li><strong>②</strong> Each delta carries only the <em>new</em> text. We also
              update <code>partial</code>, the message-so-far, like pi-ai does.</li>
              <li><strong>③</strong> The consumer handles each event as soon as it arrives and
              re-renders the screen.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the delay from 120 to 400 ms to feel the difference streaming makes.</li>
              <li>Render <code>event.delta</code> instead of <code>shown</code>: only the last
              word is visible. That's the "I forgot to concatenate deltas" bug.</li>
            </ul>
          </details>
        `,
        code: `const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fake provider stream, shaped like pi-ai events (simplified)
async function* fakeStream(text) {
  const partial = { role: 'assistant', content: [] };
  yield { type: 'start', partial };

  partial.content.push({ type: 'text', text: '' });
  yield { type: 'text_start', contentIndex: 0, partial };

  for (const delta of text.match(/\\S+\\s*/g)) {
    await sleep(120); // pretend the network / model is working
    partial.content[0].text += delta;
    yield { type: 'text_delta', contentIndex: 0, delta, partial };
  }

  yield { type: 'text_end', contentIndex: 0, content: partial.content[0].text, partial };
  yield { type: 'done', reason: 'stop', message: partial };
}

const root = document.getElementById('root');
let shown = '';
let deltas = 0;

for await (const event of fakeStream('Tokens arrive one small piece at a time.')) {
  if (event.type === 'start') {
    console.log('start');
  } else if (event.type === 'text_start') {
    console.log('text_start [' + event.contentIndex + ']');
    root.innerHTML = '<p>▌</p>';
  } else if (event.type === 'text_delta') {
    deltas++;
    shown += event.delta;
    console.log('text_delta [' + event.contentIndex + '] ' + JSON.stringify(event.delta));
    root.innerHTML = '<p>' + shown + '▌</p>';
  } else if (event.type === 'text_end') {
    console.log('text_end [' + event.contentIndex + '] full: ' + event.content);
    root.innerHTML = '<p>' + event.content + '</p>';
  } else if (event.type === 'done') {
    console.log('done reason=' + event.reason);
    root.innerHTML += '<small style="color:green">✓ done (' + event.reason + ')</small>';
  }
}
console.log('deltas received:', deltas);`,
      },
    ],
    quiz: [
      {
        q: 'What does a <code>text_delta</code> event carry?',
        options: [
          'The full answer so far, replacing the old one',
          'Only the new chunk of text since the previous delta',
          'The token count',
          'The system prompt',
        ],
        answer: 1,
        why: 'Deltas are increments. Concatenate them (or read the final message) for the full text.',
      },
      {
        q: 'What is the normal order for a successful pi-ai stream with one text block?',
        options: [
          'done → text_delta → start',
          'text_delta → text_start → text_end',
          'start → text_start → text_delta… → text_end → done',
          'start → done → text_delta…',
        ],
        answer: 2,
        why: 'Successful streams follow start → updates* → done.',
      },
      {
        q: 'Why stream at all?',
        options: [
          'It makes the model smarter',
          'It is cheaper',
          'Users see output immediately instead of waiting for the full reply',
          'It avoids the context limit',
        ],
        answer: 2,
        why: 'Total generation time is about the same; perceived latency is much lower.',
      },
      {
        q: 'A stream contains text and a tool call. How do you know which block a delta belongs to?',
        options: [
          'Events are always grouped by block, so just track the last start',
          'Use the event’s <code>contentIndex</code>',
          'Guess from the text',
          'Tool calls never stream',
        ],
        answer: 1,
        why: 'pi-ai notes events for different blocks may be interleaved; contentIndex identifies the block.',
      },
    ],
    exercise: {
      task: `<p>Write <code>collect(stream)</code>: consume the async generator, concatenate
      all <code>text_delta</code> deltas, and return <code>{ text, deltas, reason }</code>
      (reason from the <code>done</code> event). Expected log:
      <code>{ text: 'Hello from the stream!', deltas: 4, reason: 'stop' }</code>.</p>`,
      starter: `const sleep = ms => new Promise(r => setTimeout(r, ms));

async function* fakeStream(text) {
  yield { type: 'start' };
  yield { type: 'text_start', contentIndex: 0 };
  for (const delta of text.match(/\\S+\\s*/g)) {
    await sleep(50);
    yield { type: 'text_delta', contentIndex: 0, delta };
  }
  yield { type: 'text_end', contentIndex: 0 };
  yield { type: 'done', reason: 'stop' };
}

async function collect(stream) {
  const result = { text: '', deltas: 0, reason: null };
  // TODO: for await over stream
  return result;
}

console.log(await collect(fakeStream('Hello from the stream!')));`,
      hint: 'for await (const e of stream) { if (e.type === "text_delta") { result.text += e.delta; result.deltas++; } if (e.type === "done") result.reason = e.reason; }',
      solution: `const sleep = ms => new Promise(r => setTimeout(r, ms));

async function* fakeStream(text) {
  yield { type: 'start' };
  yield { type: 'text_start', contentIndex: 0 };
  for (const delta of text.match(/\\S+\\s*/g)) {
    await sleep(50);
    yield { type: 'text_delta', contentIndex: 0, delta };
  }
  yield { type: 'text_end', contentIndex: 0 };
  yield { type: 'done', reason: 'stop' };
}

async function collect(stream) {
  const result = { text: '', deltas: 0, reason: null };
  for await (const e of stream) {
    if (e.type === 'text_delta') {
      result.text += e.delta;
      result.deltas++;
    }
    if (e.type === 'done') result.reason = e.reason;
  }
  return result;
}

console.log(await collect(fakeStream('Hello from the stream!')));`,
    },
  },

  // ───────────────────────────────────────────────────────────── thinking
  {
    id: 'thinking',
    section: 'Conversation: user & assistant',
    title: 'Thinking / reasoning blocks',
    explain: `
      <p>Many modern models can <strong>think before answering</strong>. They generate
      reasoning text first ("the user wants X, the file probably ..., so ...") and then the
      final answer. Spending extra tokens on reasoning usually improves results on hard
      problems like debugging or planning a refactor.</p>
      <p>In pi-ai, reasoning appears as its own content block in the assistant message:</p>
      <pre><code>{ role: 'assistant', content: [
  { type: 'thinking', thinking: 'The test fails because ...' },  // first
  { type: 'text', text: 'The bug is an off-by-one in loop.js.' }, // then the answer
] }</code></pre>
      <p>It streams with <code>thinking_start</code> / <code>thinking_delta</code> /
      <code>thinking_end</code>, just like text. Some providers send
      <strong>redacted</strong> or signed thinking (a <code>thinkingSignature</code>) which the
      harness must keep opaque and pass back unchanged.</p>

      <h3>Thinking in pi</h3>
      <ul>
        <li><strong>Thinking level</strong>: how much reasoning to request. pi's levels are
        <code>off</code>, <code>minimal</code>, <code>low</code>, <code>medium</code>,
        <code>high</code>, <code>xhigh</code>, <code>max</code>, limited to what the current
        model supports.</li>
        <li><code>/thinking</code> picks a level; <strong>Shift+Tab</strong> cycles through the
        supported levels. The editor border shows the current level.</li>
        <li><strong>Ctrl+T</strong> shows or hides (expands/collapses) thinking blocks in the
        transcript.</li>
      </ul>

      <div class="tip">Analogy: thinking is the model's <strong>scratch paper</strong>. You
      usually only care about the final answer, but peeking at the scratch paper helps you see
      <em>why</em> it did something odd.</div>
      <div class="warn">Thinking isn't free. Reasoning tokens are billed as output tokens
      (pi's usage docs note <code>reasoning</code> is already included in <code>output</code>)
      and make responses slower. Use higher levels for hard tasks, lower for simple edits.</div>
    `,
    examples: [
      {
        title: 'Streaming a thinking block, then the answer (toggle like Ctrl+T)',
        code: `const sleep = ms => new Promise(r => setTimeout(r, ms));

// Fake stream: a thinking block (index 0), then a text block (index 1)
async function* fakeThinkingStream() {
  const thinking = ['User says tests fail. ', 'Loop uses <= length, ', 'so off by one.'];
  const answer = ['Change ', '<= to < ', 'in loop.js line 4.'];
  const msg = { role: 'assistant', content: [] };

  yield { type: 'start', partial: msg };
  msg.content.push({ type: 'thinking', thinking: '' });
  yield { type: 'thinking_start', contentIndex: 0 };
  for (const d of thinking) {
    await sleep(100);
    msg.content[0].thinking += d;
    yield { type: 'thinking_delta', contentIndex: 0, delta: d };
  }
  yield { type: 'thinking_end', contentIndex: 0, content: msg.content[0].thinking };

  msg.content.push({ type: 'text', text: '' });
  yield { type: 'text_start', contentIndex: 1 };
  for (const d of answer) {
    await sleep(100);
    msg.content[1].text += d;
    yield { type: 'text_delta', contentIndex: 1, delta: d };
  }
  yield { type: 'text_end', contentIndex: 1, content: msg.content[1].text };
  yield { type: 'done', reason: 'stop', message: msg };
}

let finalMessage = null;
for await (const e of fakeThinkingStream()) {
  console.log(e.type + (e.contentIndex !== undefined ? ' [' + e.contentIndex + ']' : ''));
  if (e.type === 'done') finalMessage = e.message;
}

// Render the final message; thinking can be shown or hidden (pi: Ctrl+T)
let showThinking = false;
const root = document.getElementById('root');

function render() {
  const parts = finalMessage.content.map(block => {
    if (block.type === 'thinking') {
      return showThinking
        ? '<div style="color:#64748b;font-style:italic;border-left:3px solid #cbd5e1;' +
          'padding-left:8px">💭 ' + block.thinking + '</div>'
        : '<div style="color:#94a3b8">💭 Thinking… (hidden)</div>';
    }
    return '<p>' + block.text + '</p>';
  });
  root.innerHTML = '<button id="toggle">Toggle thinking (like Ctrl+T)</button>' +
    parts.join('');
  root.querySelector('#toggle').addEventListener('click', () => {
    showThinking = !showThinking;
    render();
  });
}
render();

console.log('blocks:', finalMessage.content.map(b => b.type).join(' → '));`,
      },
      {
        title: 'Thinking levels trade tokens for effort (toy numbers)',
        code: `// pi's thinking levels. The token budgets below are MADE UP for illustration;
// real behavior depends on the provider and model.
const LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const TOY_BUDGET = { off: 0, minimal: 200, low: 1000, medium: 4000, high: 12000,
  xhigh: 24000, max: 32000 };

const ANSWER_TOKENS = 150;
const PRICE_PER_MILLION_OUTPUT = 15; // illustrative $

// Pretend this model only supports up to 'high' (pi clamps to supported levels)
const supported = LEVELS.slice(0, 5);

let current = 0;
function cycle() {  // like Shift+Tab
  current = (current + 1) % supported.length;
  return supported[current];
}

let level = supported[current];
for (let i = 0; i < supported.length; i++) {
  const reasoning = TOY_BUDGET[level];
  const output = reasoning + ANSWER_TOKENS; // reasoning counts as output
  const cost = (output / 1e6) * PRICE_PER_MILLION_OUTPUT;
  console.log(level.padEnd(8) + ' reasoning≈' + String(reasoning).padStart(5) +
    '  output=' + String(output).padStart(5) + '  ≈$' + cost.toFixed(4));
  level = cycle();
}
console.log('after one more Shift+Tab we are back at:', level);`,
      },
    ],
    quiz: [
      {
        q: 'In pi-ai, how is reasoning represented in an assistant message?',
        options: [
          'As a separate user message',
          'As a content block with <code>type: "thinking"</code>',
          'Inside the system prompt',
          'It is never returned',
        ],
        answer: 1,
        why: 'ThinkingContent is { type: "thinking", thinking, thinkingSignature?, redacted? }.',
      },
      {
        q: 'Which pi key shows/hides thinking blocks?',
        options: ['Ctrl+O', 'Ctrl+T', 'Shift+Tab', 'Escape'],
        answer: 1,
        why: 'Ctrl+T toggles thinking blocks. Ctrl+O is for tool output, Shift+Tab cycles the thinking level.',
      },
      {
        q: 'What does Shift+Tab do in pi?',
        options: [
          'Opens the model selector',
          'Cycles through the thinking levels supported by the current model',
          'Undoes the last message',
          'Hides tool output',
        ],
        answer: 1,
        why: 'Per pi’s usage docs: /thinking selects a level; Shift+Tab cycles supported levels.',
      },
      {
        q: 'Why not always use the highest thinking level?',
        options: [
          'It is not allowed',
          'Reasoning tokens are billed as output and add latency; simple tasks don’t need them',
          'It disables tools',
          'It clears the history',
        ],
        answer: 1,
        why: 'More reasoning = more output tokens = more cost and time.',
      },
    ],
    exercise: {
      task: `<p>Write <code>visibleText(message, showThinking)</code> that returns the text a UI
      should display. Text blocks are always shown. Thinking blocks are shown as
      <code>[thinking] ...</code> only when <code>showThinking</code> is true, and skipped
      otherwise. Join parts with <code>'\\n'</code>.</p>`,
      starter: `const message = {
  role: 'assistant',
  content: [
    { type: 'thinking', thinking: 'Check the import path first.' },
    { type: 'text', text: 'Fix: import from ./utils.js' },
  ],
};

function visibleText(msg, showThinking) {
  // TODO
  return '';
}

console.log(visibleText(message, false));
console.log('---');
console.log(visibleText(message, true));`,
      hint: 'Loop over msg.content; push block.text for type "text"; push "[thinking] " + block.thinking for type "thinking" if showThinking.',
      solution: `const message = {
  role: 'assistant',
  content: [
    { type: 'thinking', thinking: 'Check the import path first.' },
    { type: 'text', text: 'Fix: import from ./utils.js' },
  ],
};

function visibleText(msg, showThinking) {
  const parts = [];
  for (const block of msg.content) {
    if (block.type === 'text') parts.push(block.text);
    if (block.type === 'thinking' && showThinking) parts.push('[thinking] ' + block.thinking);
  }
  return parts.join('\\n');
}

console.log(visibleText(message, false));
console.log('---');
console.log(visibleText(message, true));`,
    },
  },

  // ───────────────────────────────────────────────────────────── context-budget
  {
    id: 'context-budget',
    section: 'Conversation: user & assistant',
    title: 'Context budget: why long chats get expensive and forget',
    explain: `
      <p>Combine two facts you already know:</p>
      <ol>
        <li>Every call resends the whole history (stateless API).</li>
        <li>The context window has a hard limit.</li>
      </ol>
      <p>So as a conversation grows, each call gets <strong>bigger</strong> (more cost, slower),
      and eventually the history <strong>doesn't fit</strong>. A coding agent hits this fast,
      because file contents and command output are huge compared with chat messages.</p>

      <h3>What can a harness do at the limit?</h3>
      <ul>
        <li><strong>Nothing</strong>: the provider rejects the request (context overflow).</li>
        <li><strong>Truncate</strong>: drop the oldest messages. Simple, but the model silently
        forgets early facts (like your name, or the task goal!).</li>
        <li><strong>Summarize</strong>: ask the model to write a summary of the old part, then
        send <em>summary + recent messages</em>. Keeps key facts, costs one extra call.</li>
      </ul>
      <p>Analogy: your desk is full. You can throw away the oldest papers (truncate), or write
      a one-page summary of them and throw away the originals (summarize).</p>

      <h3>How pi does it: compaction</h3>
      <p>pi uses summarization and calls it <strong>compaction</strong> (covered in depth
      later):</p>
      <ul>
        <li>Auto-compaction triggers when
        <code>contextTokens &gt; contextWindow - reserveTokens</code>. <code>reserveTokens</code>
        defaults to 16384, leaving room for the reply.</li>
        <li>It keeps the most recent messages (about <code>keepRecentTokens</code>, default 20k)
        and summarizes everything before them.</li>
        <li>You can also run <code>/compact [instructions]</code> manually.</li>
        <li>The original entries stay in the session file; only future requests use the
        summary.</li>
      </ul>
      <div class="tip">pi's footer shows context usage. When it's high and you're switching to a
      new task, starting a new session (<code>/new</code>) is often better than dragging a huge
      history along.</div>
    `,
    examples: [
      {
        title: 'Simulate: no strategy vs truncate vs summarize',
        explain: `
          <details>
            <summary>The setup</summary>
            <p>Toy numbers so the math is easy: window 300 tokens, reserve 50 for the reply, so
            the input budget is <strong>250</strong>. The system prompt is 40 tokens. Every user
            message is 20 tokens, every reply 50. Turn 1 says "My name is Ana." Turn 6 asks
            "What is my name?".</p>
            <p>Input for turn <em>n</em> without any strategy: 40 + 70×(n−1) + 20. Turn 1 = 60,
            turn 2 = 130, turn 3 = 200, turn 4 = <strong>270 &gt; 250</strong>.</p>
          </details>
          <details>
            <summary>Step by step: the three strategies</summary>
            <table>
              <tr><th>Turn</th><th>none</th><th>truncate</th><th>summarize</th></tr>
              <tr><td>1–3</td><td>60, 130, 200</td><td>60, 130, 200</td><td>60, 130, 200</td></tr>
              <tr><td>4</td><td>270 → <code>✖ context overflow</code>, stops</td>
                <td>270 → drop turn 1 → 200</td>
                <td>270 → summarize turns 1–2 (140 → 30) → 160</td></tr>
              <tr><td>5</td><td>–</td><td>270 → drop turn 2 → 200</td>
                <td>230 fits</td></tr>
              <tr><td>6</td><td>–</td><td>270 → drop turn 3 → 200<br>
                <code>I don't know your name.</code></td>
                <td>300 → summarize (summary + turns 3–4) → 160<br>
                <code>Your name is Ana.</code></td></tr>
            </table>
            <p>Console lines look like
            <code>[truncate] turn 4: 270 tokens &gt; 250 → dropped turn 1 → 200</code> and
            <code>[summarize] turn 6: 300 tokens &gt; 250 → summarized 5 msgs → 160</code>.</p>
            <p>Truncation kept the size flat but lost "My name is Ana". Summarization also kept
            the size under the budget and <strong>kept the fact</strong>, because it lives on
            inside the summary.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const used = () =&gt; SYSTEM + msgs.reduce((s, m) =&gt; s + m.tokens, 0); // ①
msgs.splice(0, 2);                                    // ② truncate: oldest pair
const old = msgs.splice(0, msgs.length - 3);          // ③ summarize: all but last 3
msgs.unshift({ role: 'user', content: summary, tokens: 30 });</code></pre>
            <ol>
              <li><strong>①</strong> Real harnesses count or estimate tokens; here each
              message just carries a <code>tokens</code> number.</li>
              <li><strong>②</strong> Truncation removes a user+assistant pair so the history
              still starts with a user message.</li>
              <li><strong>③</strong> Summarization keeps the recent messages (previous turn +
              new question) and replaces everything older with one short summary message. pi's
              compaction does the same idea with a real LLM-written summary.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>WINDOW = 500</code>: nothing overflows and all three strategies
              answer "Your name is Ana."</li>
              <li>Change the summary size from 30 to 120 and see summarization trigger more
              often.</li>
            </ul>
          </details>
        `,
        code: `const WINDOW = 300;   // toy context window
const RESERVE = 50;   // keep room for the reply (pi: reserveTokens)
const BUDGET = WINDOW - RESERVE;
const SYSTEM = 40;    // system prompt tokens

const inputs = [
  'My name is Ana.',
  'I am building a todo app.',
  'Should I use SQLite?',
  'Add tags to todos.',
  'Write a migration.',
  'What is my name?',
];

function fakeLLM(msgs) {
  const all = msgs.map(m => m.content).join(' ');
  const last = msgs[msgs.length - 1].content;
  if (/what is my name/i.test(last)) {
    return /name is Ana/i.test(all) ? 'Your name is Ana.' : "I don't know your name.";
  }
  return 'Sure, done.';
}

function run(strategy) {
  const msgs = [];
  const used = () => SYSTEM + msgs.reduce((s, m) => s + m.tokens, 0);
  const sizes = [];

  for (let turn = 1; turn <= inputs.length; turn++) {
    msgs.push({ role: 'user', content: inputs[turn - 1], tokens: 20, turn });
    const before = used();
    let note = '';

    if (before > BUDGET) {
      if (strategy === 'none') {
        console.log('[none] turn ' + turn + ': ' + before + ' tokens > ' + BUDGET +
          ' → ✖ context overflow');
        sizes.push('✖');
        break;
      }
      if (strategy === 'truncate') {
        while (used() > BUDGET) {
          note += ' → dropped turn ' + msgs[0].turn;
          msgs.splice(0, 2); // oldest user + assistant pair
        }
      }
      if (strategy === 'summarize') {
        const old = msgs.splice(0, msgs.length - 3); // keep last 3 messages
        const summary = 'Summary: ' + old.map(m => m.content).join(' / ');
        msgs.unshift({ role: 'user', content: summary, tokens: 30, turn: 'S' });
        note = ' → summarized ' + old.length + ' msgs';
      }
      console.log('[' + strategy + '] turn ' + turn + ': ' + before + ' tokens > ' +
        BUDGET + note + ' → ' + used());
    }

    sizes.push(used());
    const reply = fakeLLM(msgs);
    msgs.push({ role: 'assistant', content: reply, tokens: 50, turn });
    if (turn === inputs.length) console.log('[' + strategy + '] answer: ' + reply);
  }
  console.log('[' + strategy + '] input sizes per turn: ' + sizes.join(', '));
  return sizes;
}

const results = {};
for (const s of ['none', 'truncate', 'summarize']) results[s] = run(s);

// Draw one bar per turn per strategy
let html = '<div style="font:12px monospace">budget ' + BUDGET + ' tokens</div>';
for (const [s, sizes] of Object.entries(results)) {
  html += '<div style="display:flex;align-items:flex-end;gap:4px;height:90px;margin:6px 0">' +
    '<span style="width:80px;font:12px monospace">' + s + '</span>';
  for (const v of sizes) {
    const h = v === '✖' ? 90 : (v / BUDGET) * 80;
    html += '<div title="' + v + '" style="width:26px;height:' + h + 'px;background:' +
      (v === '✖' ? '#ef4444' : '#6366f1') + ';color:white;font-size:10px;' +
      'text-align:center">' + v + '</div>';
  }
  html += '</div>';
}
document.getElementById('root').innerHTML = html;`,
      },
    ],
    quiz: [
      {
        q: 'Why does each call in a long chat cost more than the previous one?',
        options: [
          'Providers raise prices over time',
          'The full, growing history is sent as input every call',
          'Output gets longer automatically',
          'The system prompt doubles each turn',
        ],
        answer: 1,
        why: 'Stateless API + growing history = growing input tokens per call.',
      },
      {
        q: 'What is the main downside of simple truncation?',
        options: [
          'It is expensive',
          'The model silently forgets early facts, such as the original goal',
          'It needs an extra model call',
          'It increases the context size',
        ],
        answer: 1,
        why: 'Dropped messages no longer exist for the model.',
      },
      {
        q: 'When does pi auto-compact?',
        options: [
          'Every 10 messages',
          'When contextTokens > contextWindow − reserveTokens',
          'Only when you type /new',
          'Never; it is always manual',
        ],
        answer: 1,
        why: 'Per pi’s compaction docs. reserveTokens defaults to 16384; you can also run /compact.',
      },
      {
        q: 'After pi compacts, what happens to the original messages?',
        options: [
          'They are deleted from disk',
          'They remain in the session file; future requests use the summary instead',
          'They are sent to the provider for storage',
          'They are merged into the system prompt',
        ],
        answer: 1,
        why: 'Compaction inserts a summary entry; original entries remain in the session tree.',
      },
    ],
    exercise: {
      task: `<p>Write <code>truncateToFit(msgs, budget)</code>. Each message has a
      <code>tokens</code> field. Remove messages from the <strong>front</strong> (oldest
      first) until the total is ≤ <code>budget</code>. Return the kept messages (don't mutate
      the input). With budget 100 the result should keep only <code>c</code> and
      <code>d</code> (total 90).</p>`,
      starter: `const history = [
  { content: 'a', tokens: 40 },
  { content: 'b', tokens: 30 },
  { content: 'c', tokens: 50 },
  { content: 'd', tokens: 40 },
];

function truncateToFit(msgs, budget) {
  const kept = [...msgs];
  // TODO: shift oldest until total <= budget
  return kept;
}

const kept = truncateToFit(history, 100);
console.log(kept.map(m => m.content).join(','), 'total:',
  kept.reduce((s, m) => s + m.tokens, 0));
console.log('original still has', history.length, 'messages');`,
      hint: 'const total = () => kept.reduce((s, m) => s + m.tokens, 0); while (kept.length && total() > budget) kept.shift();',
      solution: `const history = [
  { content: 'a', tokens: 40 },
  { content: 'b', tokens: 30 },
  { content: 'c', tokens: 50 },
  { content: 'd', tokens: 40 },
];

function truncateToFit(msgs, budget) {
  const kept = [...msgs];
  const total = () => kept.reduce((s, m) => s + m.tokens, 0);
  while (kept.length > 0 && total() > budget) kept.shift();
  return kept;
}

const kept = truncateToFit(history, 100);
console.log(kept.map(m => m.content).join(','), 'total:',
  kept.reduce((s, m) => s + m.tokens, 0));
console.log('original still has', history.length, 'messages');`,
    },
  },
);
