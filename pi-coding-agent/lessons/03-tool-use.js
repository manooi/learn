window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------ why-tools
  {
    id: 'why-tools',
    section: 'Tool Use',
    title: 'Why tools?',
    explain: `
      <p>A language model produces <strong>text</strong>, and that's all it can do. It can't open
      a file, run <code>npm test</code> or look at your screen. If you ask "what version is
      my project?", a model with no tools has to guess.</p>
      <p><strong>Tools</strong> fix this. The harness (pi, Claude Code, Cursor and so on) tells the
      model: "these are the actions I can do for you". The model can then answer with a
      structured <em>request</em>, such as "please run <code>read</code> with
      <code>path = package.json</code>". The <strong>harness</strong> does the work and sends the
      result back as another message.</p>
      <h3>Analogy: a brain on a phone call</h3>
      <p>Picture a brilliant engineer on a phone call with you. They can't see or touch your
      computer. You sit at the keyboard. They say "open package.json and read me the version
      line", you do it and read the answer back, and then they tell you what to do next.</p>
      <ul>
        <li><strong>Model</strong> = the engineer on the phone. It thinks and decides, but only by talking.</li>
        <li><strong>Harness</strong> = you at the keyboard. You carry out the requests and report back.</li>
        <li><strong>Tools</strong> = the list of things you've said you can do ("I can read files,
        run shell commands, edit files").</li>
      </ul>
      <div class="tip">Everything that makes a "coding agent" feel alive (reading code, running
      tests, fixing bugs) is the harness running tools the model asked for. The model never
      touches your disk directly.</div>
      <div class="warn">Because the harness runs the tools, the harness also decides how safe they
      are. Pi runs its tools with the full permissions of your user account and doesn't ask
      before each call. We come back to this in <em>The Agent Loop</em>.</div>
    `,
    examples: [
      {
        title: 'Same question, with and without a tool',
        code: `// A fake "model". It can only RETURN data: some text or a tool request.
// It has no way to open a file itself.
const fs = {
  'package.json': '{ "name": "shop-api", "version": "2.3.1" }',
};

function fakeLLM(messages, tools) {
  const last = messages[messages.length - 1];

  // The harness sent back a tool result, so now the model can answer.
  if (last.role === 'toolResult') {
    const pkg = JSON.parse(last.content[0].text);
    return {
      role: 'assistant',
      content: [{ type: 'text', text: 'Your project is version ' + pkg.version + '.' }],
      stopReason: 'stop',
    };
  }

  // No tools offered, so all it can do is guess.
  if (tools.length === 0) {
    return {
      role: 'assistant',
      content: [{ type: 'text', text: "I can't see your files. Maybe version 1.0.0?" }],
      stopReason: 'stop',
    };
  }

  // A read tool is offered, so it asks the harness to use it.
  return {
    role: 'assistant',
    content: [
      {
        type: 'toolCall',
        id: 'call_1',
        name: 'read',
        arguments: { path: 'package.json' },
      },
    ],
    stopReason: 'toolUse',
  };
}

// The harness: the "hands" that actually touch the computer.
function runTool(call) {
  if (call.name === 'read') return fs[call.arguments.path];
  return 'Tool ' + call.name + ' not found';
}

function ask(question, tools) {
  const messages = [{ role: 'user', content: question }];
  let reply = fakeLLM(messages, tools);
  messages.push(reply);

  const call = reply.content.find((block) => block.type === 'toolCall');
  if (call) {
    const args = JSON.stringify(call.arguments);
    console.log('  model asks the harness: ' + call.name + ' ' + args);
    const output = runTool(call);
    console.log('  harness ran it, got: ' + output);
    messages.push({
      role: 'toolResult',
      toolCallId: call.id,
      toolName: call.name,
      content: [{ type: 'text', text: output }],
      isError: false,
    });
    reply = fakeLLM(messages, tools);
    messages.push(reply);
  }
  return reply.content[0].text;
}

const question = 'What version is my project?';

console.log('WITHOUT tools:');
const a1 = ask(question, []);
console.log('  answer: ' + a1);

console.log('WITH a read tool:');
const a2 = ask(question, [{ name: 'read' }]);
console.log('  answer: ' + a2);

document.getElementById('root').innerHTML =
  '<p><b>No tools:</b> ' + a1 + '</p>' +
  '<p><b>With read:</b> ' + a2 + '</p>';`,
      },
    ],
    quiz: [
      {
        q: 'What can a language model produce on its own?',
        options: [
          'Text only (which may include a structured tool request)',
          'Text, and it can also read files it is told about',
          'Anything the operating system allows',
          'Shell commands that run automatically',
        ],
        answer: 0,
        why: 'The model only outputs text. A tool call is structured text that the harness reads and carries out.',
      },
      {
        q: 'In the phone-call analogy, who is the person at the keyboard?',
        options: ['The model', 'The harness', 'The tool schema', 'The user\'s terminal font'],
        answer: 1,
        why: 'The harness carries out what the model asks for and reports the result back.',
      },
      {
        q: 'Who actually reads package.json in the example?',
        options: [
          'fakeLLM, because it has the path',
          'The <code>runTool</code> function in the harness',
          'Nobody. The model remembers it from training',
          'The browser',
        ],
        answer: 1,
        why: 'The model only returned <code>{ type: "toolCall", name: "read", ... }</code>. The harness function did the reading.',
      },
      {
        q: 'Why does the harness decide how dangerous tools are?',
        options: [
          'Because the model refuses unsafe requests',
          'Because the harness is the one that executes them, with its own permissions',
          'Because tools are sandboxed by the LLM provider',
          'It doesn\'t matter; tools are always safe',
        ],
        answer: 1,
        why: 'The model only asks. The harness process runs the command, so it decides what is allowed. Pi uses your user account\'s permissions.',
      },
    ],
    exercise: {
      task: `<p>The user asks "What files are in this project?" and the fake model asks for an
      <code>ls</code> tool. The harness only knows <code>read</code>, so the model gets back
      <code>Tool ls not found</code>.</p>
      <p>Add an <code>ls</code> case to <code>runTool</code> that returns every file path in
      <code>fs</code>, one per line. The model should then list the 3 files.</p>`,
      starter: `const fs = {
  'README.md': '# Demo',
  'src/app.js': 'console.log("hi");',
  'src/db.js': 'export const db = {};',
};

function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  if (last.role === 'user') {
    return {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call_1', name: 'ls', arguments: {} }],
      stopReason: 'toolUse',
    };
  }
  const text = last.content[0].text;
  if (text.startsWith('Tool ')) {
    return { role: 'assistant', content: [{ type: 'text', text: 'Sorry: ' + text }] };
  }
  const files = text.split('\\n');
  const answer = 'I found ' + files.length + ' files: ' + files.join(', ');
  return { role: 'assistant', content: [{ type: 'text', text: answer }] };
}

function runTool(call) {
  if (call.name === 'read') return fs[call.arguments.path];
  // TODO: handle 'ls' here
  return 'Tool ' + call.name + ' not found';
}

const messages = [{ role: 'user', content: 'What files are in this project?' }];
const reply = fakeLLM(messages);
messages.push(reply);
const call = reply.content[0];
const output = runTool(call);
messages.push({
  role: 'toolResult',
  toolCallId: call.id,
  toolName: call.name,
  content: [{ type: 'text', text: output }],
  isError: false,
});
console.log(fakeLLM(messages).content[0].text);`,
      hint: 'Object.keys(fs) gives you the paths. Join them with "\\n".',
      solution: `const fs = {
  'README.md': '# Demo',
  'src/app.js': 'console.log("hi");',
  'src/db.js': 'export const db = {};',
};

function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  if (last.role === 'user') {
    return {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call_1', name: 'ls', arguments: {} }],
      stopReason: 'toolUse',
    };
  }
  const text = last.content[0].text;
  if (text.startsWith('Tool ')) {
    return { role: 'assistant', content: [{ type: 'text', text: 'Sorry: ' + text }] };
  }
  const files = text.split('\\n');
  const answer = 'I found ' + files.length + ' files: ' + files.join(', ');
  return { role: 'assistant', content: [{ type: 'text', text: answer }] };
}

function runTool(call) {
  if (call.name === 'read') return fs[call.arguments.path];
  if (call.name === 'ls') return Object.keys(fs).join('\\n');
  return 'Tool ' + call.name + ' not found';
}

const messages = [{ role: 'user', content: 'What files are in this project?' }];
const reply = fakeLLM(messages);
messages.push(reply);
const call = reply.content[0];
const output = runTool(call);
messages.push({
  role: 'toolResult',
  toolCallId: call.id,
  toolName: call.name,
  content: [{ type: 'text', text: output }],
  isError: false,
});
console.log(fakeLLM(messages).content[0].text);`,
    },
  },

  // ------------------------------------------------------------------ tool-schema
  {
    id: 'tool-schema',
    section: 'Tool Use',
    title: 'Defining a tool',
    explain: `
      <p>The model can only ask for a tool it knows about. Every request the harness sends
      includes a list of <strong>tool definitions</strong>. In pi's AI library
      (<code>@earendil-works/pi-ai</code>) a tool is:</p>
      <pre><code>interface Tool {
  name: string;         // what the model writes in its toolCall, e.g. "read"
  description: string;  // plain English: when and how to use it
  parameters: TSchema;  // a JSON Schema describing the arguments
}</code></pre>
      <ul>
        <li><strong>name</strong>: short and unique. The model uses it to pick the tool.</li>
        <li><strong>description</strong>: this is prompt text. The model reads it to decide
        <em>when</em> to use the tool, so a vague description leads to bad choices.</li>
        <li><strong>parameters</strong>: a <strong>JSON Schema</strong> object listing each
        argument, its type, a description, and which arguments are <code>required</code>.</li>
      </ul>
      <h3>TypeBox: JSON Schema written as code</h3>
      <p>Writing JSON Schema by hand is noisy, so pi uses <strong>TypeBox</strong>.
      <code>Type.Object({ path: Type.String() })</code> <em>returns</em> a plain JSON Schema
      object and also gives TypeScript a static type. It is used in two places: the schema is
      sent to the model, and pi validates the model's arguments against it before running the
      tool.</p>
      <p>This is pi's real <code>read</code> tool schema (from
      <code>packages/coding-agent/src/core/tools/read.ts</code>):</p>
      <pre><code>const readSchema = Type.Object({
  path: Type.String({ description: "Path to the file to read (relative or absolute)" }),
  offset: Type.Optional(Type.Number({ description: "Line number to start reading from (1-indexed)" })),
  limit: Type.Optional(Type.Number({ description: "Maximum number of lines to read" })),
});</code></pre>
      <h3>What the model "sees"</h3>
      <p>In pi the model gets tool information in two forms:</p>
      <ol>
        <li>The full definitions (name, description, JSON Schema) go in the request's tool list.
        Each provider adapter converts them to its own wire format.</li>
        <li>The system prompt also lists each active tool on one line, for example
        <code>- read: Read file contents</code>, followed by usage guidelines such as "Use read
        to examine files instead of cat or sed."</li>
      </ol>
      <div class="tip">Descriptions do real work. Pi's <code>read</code> description tells the
      model that output is cut off at 2000 lines or 50KB and that it can continue with
      <code>offset</code>. That text shapes how the model uses the tool.</div>
    `,
    examples: [
      {
        title: 'A mini TypeBox that turns code into JSON Schema',
        code: `// A tiny stand-in for TypeBox. The real one: import { Type } from "typebox".
// Each helper returns a plain JSON Schema object.
const Type = {
  String: (opts = {}) => ({ type: 'string', ...opts }),
  Number: (opts = {}) => ({ type: 'number', ...opts }),
  Boolean: (opts = {}) => ({ type: 'boolean', ...opts }),
  Optional: (schema) => ({ ...schema, optional: true }),
  Object: (props) => {
    const properties = {};
    const required = [];
    for (const [key, schema] of Object.entries(props)) {
      const { optional, ...rest } = schema;
      properties[key] = rest;
      if (!optional) required.push(key);
    }
    return { type: 'object', properties, required };
  },
};

// Two tools, modelled on pi's read and bash
const tools = [
  {
    name: 'read',
    description: 'Read the contents of a file. Use offset/limit for large files.',
    parameters: Type.Object({
      path: Type.String({ description: 'Path to the file to read' }),
      offset: Type.Optional(Type.Number({ description: 'First line (1-indexed)' })),
      limit: Type.Optional(Type.Number({ description: 'Max lines to read' })),
    }),
  },
  {
    name: 'bash',
    description: 'Execute a bash command in the current working directory.',
    parameters: Type.Object({
      command: Type.String({ description: 'Shell command to execute' }),
      timeout: Type.Optional(Type.Number({ description: 'Timeout in seconds' })),
    }),
  },
];

for (const tool of tools) {
  const props = Object.keys(tool.parameters.properties);
  const optional = props.filter((p) => !tool.parameters.required.includes(p));
  console.log(tool.name + ': required=' + tool.parameters.required.join(',') +
    ' optional=' + optional.join(','));
}

// The one-line list that pi also puts in the system prompt
const promptLines = tools.map((t) => '- ' + t.name + ': ' + t.description.split('.')[0]);
console.log('System prompt tool list:');
promptLines.forEach((line) => console.log('  ' + line));

// Show the JSON that goes into the request's tool list
const style = 'font-size:12px;background:#f4f5f9;padding:8px;';
const pre = (s) => '<pre style="' + style + '">' + s + '</pre>';
document.getElementById('root').innerHTML =
  '<b>Tool definitions sent with the request:</b>' + pre(JSON.stringify(tools, null, 2));`,
      },
      {
        title: 'The real thing: a custom tool in a pi extension (read-only)',
        runnable: false,
        code: `// From pi's examples/extensions/hello.ts
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const helloTool = defineTool({
  name: "hello",
  label: "Hello",                         // shown in pi's UI, not sent to the model
  description: "A simple greeting tool",
  parameters: Type.Object({
    name: Type.String({ description: "Name to greet" }),
  }),

  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    return {
      // content goes to the model
      content: [{ type: "text", text: "Hello, " + params.name + "!" }],
      // details is for the UI / session only
      details: { greeted: params.name },
    };
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(helloTool);
}`,
      },
    ],
    quiz: [
      {
        q: 'Which three fields make up a tool definition in pi-ai\'s <code>Tool</code> interface?',
        options: [
          '<code>name</code>, <code>description</code>, <code>parameters</code>',
          '<code>id</code>, <code>command</code>, <code>output</code>',
          '<code>name</code>, <code>execute</code>, <code>result</code>',
          '<code>type</code>, <code>role</code>, <code>content</code>',
        ],
        answer: 0,
        why: 'The model gets name + description + a JSON Schema of parameters. <code>execute</code> lives in the harness and is never sent to the model.',
      },
      {
        q: 'What does <code>Type.Object({ path: Type.String() })</code> produce?',
        options: [
          'A TypeScript class you must instantiate',
          'A plain JSON Schema object (plus a static TypeScript type)',
          'A function that reads files',
          'A string of documentation',
        ],
        answer: 1,
        why: 'TypeBox builders return JSON Schema objects. The same object is sent to the model and used to validate arguments.',
      },
      {
        q: 'Why does the <code>description</code> matter so much?',
        options: [
          'It is used as the file name',
          'The model reads it to decide when and how to call the tool',
          'It is only shown to the human',
          'It sets the timeout',
        ],
        answer: 1,
        why: 'The description is prompt text. Pi\'s read description even explains truncation and <code>offset</code>, which teaches the model how to handle large files.',
      },
      {
        q: 'In pi\'s read schema, which argument is required?',
        options: ['<code>offset</code>', '<code>limit</code>', '<code>path</code>', 'All three'],
        answer: 2,
        why: '<code>offset</code> and <code>limit</code> are wrapped in <code>Type.Optional</code>. Only <code>path</code> is required.',
      },
    ],
    exercise: {
      task: `<p>Using the mini <code>Type</code> helper, define a <code>grep</code> tool with:</p>
      <ul>
        <li><code>pattern</code>: required string ("Search pattern (regex or literal string)")</li>
        <li><code>path</code>: optional string ("Directory or file to search")</li>
        <li><code>ignoreCase</code>: optional boolean ("Case-insensitive search")</li>
      </ul>
      <p>The console should print <code>required: pattern</code> and
      <code>optional: path, ignoreCase</code>. These are the names pi's real grep tool uses.</p>`,
      starter: `const Type = {
  String: (opts = {}) => ({ type: 'string', ...opts }),
  Boolean: (opts = {}) => ({ type: 'boolean', ...opts }),
  Optional: (schema) => ({ ...schema, optional: true }),
  Object: (props) => {
    const properties = {};
    const required = [];
    for (const [key, schema] of Object.entries(props)) {
      const { optional, ...rest } = schema;
      properties[key] = rest;
      if (!optional) required.push(key);
    }
    return { type: 'object', properties, required };
  },
};

const grepTool = {
  name: 'grep',
  description: 'Search file contents for a pattern.',
  parameters: Type.Object({
    // TODO: pattern, path, ignoreCase
  }),
};

const p = grepTool.parameters;
const optional = Object.keys(p.properties).filter((k) => !p.required.includes(k));
console.log('required: ' + p.required.join(', '));
console.log('optional: ' + optional.join(', '));
console.log(JSON.stringify(p, null, 2));`,
      hint: 'Wrap optional fields in Type.Optional(...). For example: path: Type.Optional(Type.String({ description: "..." })).',
      solution: `const Type = {
  String: (opts = {}) => ({ type: 'string', ...opts }),
  Boolean: (opts = {}) => ({ type: 'boolean', ...opts }),
  Optional: (schema) => ({ ...schema, optional: true }),
  Object: (props) => {
    const properties = {};
    const required = [];
    for (const [key, schema] of Object.entries(props)) {
      const { optional, ...rest } = schema;
      properties[key] = rest;
      if (!optional) required.push(key);
    }
    return { type: 'object', properties, required };
  },
};

const grepTool = {
  name: 'grep',
  description: 'Search file contents for a pattern.',
  parameters: Type.Object({
    pattern: Type.String({ description: 'Search pattern (regex or literal string)' }),
    path: Type.Optional(Type.String({ description: 'Directory or file to search' })),
    ignoreCase: Type.Optional(Type.Boolean({ description: 'Case-insensitive search' })),
  }),
};

const p = grepTool.parameters;
const optional = Object.keys(p.properties).filter((k) => !p.required.includes(k));
console.log('required: ' + p.required.join(', '));
console.log('optional: ' + optional.join(', '));
console.log(JSON.stringify(p, null, 2));`,
    },
  },

  // ------------------------------------------------------------------ tool-call-roundtrip
  {
    id: 'tool-call-roundtrip',
    section: 'Tool Use',
    title: 'The tool call round-trip',
    explain: `
      <p>This is the most important pattern in the course. One tool use takes
      <strong>two model calls</strong> with the harness working in between:</p>
      <ol>
        <li>The <strong>user</strong> message goes to the model, along with the tool definitions.</li>
        <li>The model replies with an <strong>assistant</strong> message whose <code>content</code>
        contains a <code>toolCall</code> block. Its <code>stopReason</code> is
        <code>"toolUse"</code>: "I stopped because I need a tool."</li>
        <li>The <strong>harness</strong> runs the tool and appends a <strong>toolResult</strong>
        message whose <code>toolCallId</code> equals the call's <code>id</code>.</li>
        <li>The harness calls the model <em>again</em> with the whole array. The model reads
        the result and continues. Here it answers, with <code>stopReason: "stop"</code>.</li>
      </ol>
      <p>These are pi's real shapes (from <code>packages/ai/src/types.ts</code>):</p>
      <pre><code>// inside an assistant message's content array
{ type: "toolCall", id: string, name: string, arguments: Record&lt;string, any&gt; }

// a separate message in the messages array
{
  role: "toolResult",
  toolCallId: string,   // must equal the toolCall's id
  toolName: string,
  content: (TextContent | ImageContent)[],
  isError: boolean,
  timestamp: number,
}</code></pre>
      <p>Pi's full list of <code>stopReason</code> values is <code>"stop"</code>,
      <code>"length"</code>, <code>"toolUse"</code>, <code>"error"</code>,
      <code>"aborted"</code>, plus <code>"pending"</code> while streaming and
      <code>"deferred"</code> for responses fetched later.</p>
      <div class="tip">Remember that the API is <strong>stateless</strong>. The model doesn't
      "wait" for the tool result. The first call is finished. The second call sends the
      <em>entire</em> history again, now with the result at the end.</div>
    `,
    examples: [
      {
        title: 'Watch the messages array grow, step by step',
        code: `const fs = { 'src/config.js': 'export const PORT = 8080;' };

const tools = [
  {
    name: 'read',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
];

function fakeLLM(messages, tools) {
  const last = messages[messages.length - 1];

  if (last.role === 'user') {
    return {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check the config.' },
        {
          type: 'toolCall',
          id: 'call_A1',
          name: 'read',
          arguments: { path: 'src/config.js' },
        },
      ],
      stopReason: 'toolUse',
    };
  }

  // Real providers reject a toolResult whose id matches no earlier toolCall.
  const asked = messages.some(
    (m) => m.role === 'assistant' && m.content.some((b) => b.id === last.toolCallId),
  );
  if (!asked) {
    return {
      role: 'assistant',
      content: [],
      stopReason: 'error',
      errorMessage: 'toolResult ' + last.toolCallId + ' matches no toolCall',
    };
  }

  const port = last.content[0].text.split('= ')[1].replace(';', '');
  return {
    role: 'assistant',
    content: [{ type: 'text', text: 'The server listens on port ' + port + '.' }],
    stopReason: 'stop',
  };
}

function summarize(m) {
  if (m.role === 'user') return 'user: "' + m.content + '"';
  if (m.role === 'toolResult') {
    return 'toolResult toolCallId=' + m.toolCallId + ' isError=' + m.isError +
      ' text=' + JSON.stringify(m.content[0].text);
  }
  const parts = m.content.map((b) =>
    b.type === 'text' ? 'text' : 'toolCall ' + b.name + ' id=' + b.id);
  const err = m.errorMessage ? ' (' + m.errorMessage + ')' : '';
  return 'assistant [' + parts.join(' + ') + '] stopReason=' + m.stopReason + err;
}

function show(label, messages) {
  console.log(label + ' -> messages.length = ' + messages.length);
  messages.forEach((m, i) => console.log('  [' + i + '] ' + summarize(m)));
}

// Step 1: the user asks a question
const messages = [{ role: 'user', content: 'Which port does the server use?' }];
show('Step 1', messages);

// Step 2: model call #1. It replies with a toolCall block.
const reply1 = fakeLLM(messages, tools); // ①
messages.push(reply1);
show('Step 2', messages);

// Step 3: the harness runs every toolCall and appends a toolResult
for (const call of reply1.content.filter((b) => b.type === 'toolCall')) {
  const text = fs[call.arguments.path];
  messages.push({
    role: 'toolResult',
    toolCallId: call.id, // ② must match the call
    toolName: call.name,
    content: [{ type: 'text', text }],
    isError: false,
    timestamp: Date.now(),
  });
}
show('Step 3', messages);

// Step 4: model call #2 with the WHOLE history, now including the result
const reply2 = fakeLLM(messages, tools); // ③
messages.push(reply2);
show('Step 4', messages);

const color = { user: '#dbeafe', assistant: '#dcfce7', toolResult: '#fef3c7' };
document.getElementById('root').innerHTML = messages
  .map((m, i) => '<div style="background:' + color[m.role] +
    ';padding:6px 10px;margin:4px 0;border-radius:6px;font-size:13px;">' +
    '<b>[' + i + '] ' + m.role + '</b> ' + summarize(m).split(': ').slice(1).join(': ') +
    '</div>')
  .join('');`,
        explain: `
          <details>
            <summary>The problem: the model can't run anything itself</summary>
            <p>The model gets one request and sends one response. It can't pause halfway
            through, read a file and then carry on. So "use a tool" is split in two. The model
            <em>ends</em> its response with a request (<code>stopReason: "toolUse"</code>), and a
            <em>new</em> request later brings back the answer. The harness sits in between and
            links the two with a shared id.</p>
          </details>
          <details>
            <summary>Step by step: the messages array after each step</summary>
            <table>
              <tr><th>Step</th><th>Who acts</th><th>messages array</th><th>Console</th></tr>
              <tr><td>1</td><td>User</td><td><code>[user]</code></td>
                <td><code>Step 1 -&gt; messages.length = 1</code><br>
                <code>[0] user: "Which port does the server use?"</code></td></tr>
              <tr><td>2</td><td>Model call #1 (①)</td><td><code>[user, assistant]</code></td>
                <td><code>Step 2 -&gt; messages.length = 2</code><br>
                <code>[1] assistant [text + toolCall read id=call_A1] stopReason=toolUse</code></td></tr>
              <tr><td>3</td><td>Harness runs <code>read</code> (②)</td>
                <td><code>[user, assistant, toolResult]</code></td>
                <td><code>Step 3 -&gt; messages.length = 3</code><br>
                <code>[2] toolResult toolCallId=call_A1 isError=false text="export const PORT = 8080;"</code></td></tr>
              <tr><td>4</td><td>Model call #2 (③)</td>
                <td><code>[user, assistant, toolResult, assistant]</code></td>
                <td><code>Step 4 -&gt; messages.length = 4</code><br>
                <code>[3] assistant [text] stopReason=stop</code></td></tr>
            </table>
            <p>Each "Step" line also reprints the earlier messages, so you can watch the array
            grow. The preview shows the final 4 messages colored by role.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const reply1 = fakeLLM(messages, tools);  // ① call #1: model sees tools, asks for one
toolCallId: call.id,                      // ② the result points back at the request
const reply2 = fakeLLM(messages, tools);  // ③ call #2: full history + result</code></pre>
            <ol>
              <li><strong>①</strong> The model's reply has two blocks: a text block ("Let me
              check the config.") and a <code>toolCall</code> block. One assistant message can
              hold several blocks.</li>
              <li><strong>②</strong> The <code>toolCallId</code> is how the model knows which
              request this output answers. It matters most when there are several calls.</li>
              <li><strong>③</strong> The second call is a completely new request. It works only
              because the harness sends back everything, including the model's own earlier
              <code>toolCall</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>toolCallId: call.id</code> to <code>toolCallId: 'oops'</code>. Step 4
              becomes <code>stopReason=error (toolResult oops matches no toolCall)</code>. Real
              providers return an error much like this.</li>
              <li>Delete the Step 3 loop. The last message is then the assistant's, and our fake
              model crashes reading <code>last.content[0].text</code>. Real APIs also reject
              a toolCall that has no result.</li>
            </ul>
            <div class="warn">Every <code>toolCall</code> needs exactly one matching
            <code>toolResult</code> before you call the model again, even when the tool
            failed. Failures are covered in the next lesson.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What <code>stopReason</code> does an assistant message have when it ends by requesting a tool?',
        options: ['<code>"stop"</code>', '<code>"toolUse"</code>', '<code>"length"</code>', '<code>"pending"</code>'],
        answer: 1,
        why: 'Pi normalises every provider to <code>"toolUse"</code> for this case. <code>"stop"</code> means a normal finish.',
      },
      {
        q: 'How does a toolResult say which tool call it answers?',
        options: [
          'By its position in the array only',
          'Its <code>toolCallId</code> equals the toolCall block\'s <code>id</code>',
          'By repeating the arguments',
          'The model guesses',
        ],
        answer: 1,
        why: 'The id pairs request and result. Pi\'s ToolResultMessage has <code>toolCallId</code>, <code>toolName</code>, <code>content</code> and <code>isError</code>.',
      },
      {
        q: 'How many model calls does one simple tool use take?',
        options: ['One. The model waits for the result', 'Two', 'Three', 'Zero, the harness answers'],
        answer: 1,
        why: 'Call #1 ends with a toolCall. The harness runs the tool. Call #2 sends the history plus the result so the model can continue.',
      },
      {
        q: 'Where does the <code>toolCall</code> block live?',
        options: [
          'In a separate message with role "tool"',
          'Inside the assistant message\'s <code>content</code> array',
          'In the system prompt',
          'In the tool definition',
        ],
        answer: 1,
        why: 'In pi the assistant\'s <code>content</code> is an array of text, thinking and toolCall blocks. Results are separate <code>role: "toolResult"</code> messages.',
      },
    ],
    exercise: {
      task: `<p>Write <code>makeToolResult(call, output)</code> so it returns a proper toolResult
      message: <code>role</code>, <code>toolCallId</code>, <code>toolName</code>,
      <code>content</code> (an array with one text block), <code>isError: false</code> and
      <code>timestamp</code>.</p>
      <p>The fake model checks the shape and complains about the first thing that's wrong.
      When it's right, it answers with the file contents.</p>`,
      starter: `const fs = { 'notes.txt': 'Deploy on Friday' };

function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  if (last.role === 'user') {
    const args = { path: 'notes.txt' };
    return {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call_9', name: 'read', arguments: args }],
      stopReason: 'toolUse',
    };
  }
  if (last.role !== 'toolResult') return say('Expected role "toolResult"');
  if (last.toolCallId !== 'call_9') return say('toolCallId must be "call_9"');
  if (last.toolName !== 'read') return say('toolName must be "read"');
  if (!Array.isArray(last.content)) return say('content must be an array of blocks');
  if (last.content[0].type !== 'text') return say('first block must have type "text"');
  if (last.isError !== false) return say('isError must be false');
  return say('Your notes say: ' + last.content[0].text);
}

function say(text) {
  return { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop' };
}

function makeToolResult(call, output) {
  // TODO: return a full toolResult message
  return { role: 'toolResult' };
}

const messages = [{ role: 'user', content: 'What do my notes say?' }];
const reply = fakeLLM(messages);
messages.push(reply);

const call = reply.content[0];
messages.push(makeToolResult(call, fs[call.arguments.path]));

const final = fakeLLM(messages);
console.log('model: ' + final.content[0].text);`,
      hint: 'content is [{ type: "text", text: output }]. toolCallId comes from call.id and toolName from call.name.',
      solution: `const fs = { 'notes.txt': 'Deploy on Friday' };

function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  if (last.role === 'user') {
    const args = { path: 'notes.txt' };
    return {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call_9', name: 'read', arguments: args }],
      stopReason: 'toolUse',
    };
  }
  if (last.role !== 'toolResult') return say('Expected role "toolResult"');
  if (last.toolCallId !== 'call_9') return say('toolCallId must be "call_9"');
  if (last.toolName !== 'read') return say('toolName must be "read"');
  if (!Array.isArray(last.content)) return say('content must be an array of blocks');
  if (last.content[0].type !== 'text') return say('first block must have type "text"');
  if (last.isError !== false) return say('isError must be false');
  return say('Your notes say: ' + last.content[0].text);
}

function say(text) {
  return { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop' };
}

function makeToolResult(call, output) {
  return {
    role: 'toolResult',
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: 'text', text: output }],
    isError: false,
    timestamp: Date.now(),
  };
}

const messages = [{ role: 'user', content: 'What do my notes say?' }];
const reply = fakeLLM(messages);
messages.push(reply);

const call = reply.content[0];
messages.push(makeToolResult(call, fs[call.arguments.path]));

const final = fakeLLM(messages);
console.log('model: ' + final.content[0].text);`,
    },
  },

  // ------------------------------------------------------------------ tool-errors
  {
    id: 'tool-errors',
    section: 'Tool Use',
    title: 'Tool errors & validation',
    explain: `
      <p>Models make mistakes. They misspell a path, forget an argument, or call a tool that
      doesn't exist. A good harness does <strong>not</strong> crash when this happens. It turns
      the failure into a normal toolResult with <code>isError: true</code> and a clear message,
      then lets the model try again.</p>
      <h3>What pi does (packages/agent/src/agent-loop.ts)</h3>
      <ul>
        <li><strong>Unknown tool</strong>: the result text is <code>Tool &lt;name&gt; not found</code>, with <code>isError: true</code>.</li>
        <li><strong>Bad arguments</strong>: pi checks the arguments against the TypeBox schema
        <em>before</em> running the tool. If they don't match, the result starts
        <code>Validation failed for tool "read":</code>, lists each problem and shows the
        arguments it received.</li>
        <li><strong>Tool throws</strong>: if <code>execute()</code> throws (for example, file
        not found), the loop catches it and uses <code>error.message</code> as the error result.</li>
        <li><strong>bash non-zero exit</strong>: pi's bash tool marks the result
        <code>isError: true</code> and appends <code>Command exited with code N</code>.</li>
      </ul>
      <p>Because the error is just another message, the model reads it on the next call and
      usually <strong>corrects itself</strong>: it fixes the argument name or tries another path.</p>
      <div class="tip">Error text is prompt text. "File not found" helps a little. "File not
      found: src/utils.js. Files that exist: src/util.js, ..." helps far more. Pi's edit tool
      says things like "The old text must match exactly including all whitespace and
      newlines" for the same reason.</div>
      <div class="warn">An uncaught exception in the harness ends the whole run. The model
      never sees what went wrong and can't recover.</div>
    `,
    examples: [
      {
        title: 'The model makes two mistakes and recovers',
        code: `const fs = {
  'src/util.js': 'export const slugify = (s) => s.toLowerCase().split(" ").join("-");',
  'src/index.js': 'import { slugify } from "./util.js";',
};

const CATCH_ERRORS = true; // Try false: the harness crashes on the first mistake

const tools = {
  read: {
    required: ['path'],
    execute(args) {
      if (!(args.path in fs)) {
        throw new Error('ENOENT: no such file: ' + args.path +
          '. Files that exist: ' + Object.keys(fs).join(', '));
      }
      return fs[args.path];
    },
  },
};

function validate(name, tool, args) {
  for (const key of tool.required) {
    if (args[key] === undefined) {
      throw new Error('Validation failed for tool "' + name + '": missing property "' +
        key + '". Received arguments: ' + JSON.stringify(args));
    }
  }
}

function executeToolCall(call) {
  const result = (text, isError) => ({
    role: 'toolResult',
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: 'text', text }],
    isError,
  });
  try {
    const tool = tools[call.name];
    if (!tool) throw new Error('Tool ' + call.name + ' not found'); // ①
    validate(call.name, tool, call.arguments); // ②
    return result(tool.execute(call.arguments), false);
  } catch (err) {
    if (!CATCH_ERRORS) throw err;
    return result(err.message, true); // ③
  }
}

// Scripted model: it reacts to the last message it sees
let nextId = 1;
const callTool = (name, args) => ({
  role: 'assistant',
  content: [{ type: 'toolCall', id: 'call_' + nextId++, name, arguments: args }],
  stopReason: 'toolUse',
});
const say = (text) => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
  stopReason: 'stop',
});

function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  if (last.role === 'user') return callTool('read', { file: 'src/utils.js' });
  const text = last.content[0].text;
  if (last.isError && text.startsWith('Validation failed')) {
    return callTool('read', { path: 'src/utils.js' }); // fixes the argument name
  }
  if (last.isError && text.startsWith('ENOENT')) {
    const files = text.split('Files that exist: ')[1].split(', ');
    return callTool('read', { path: files.find((f) => f.includes('util')) });
  }
  return say('slugify lowercases the text and replaces spaces with dashes.');
}

const messages = [{ role: 'user', content: 'What does slugify in src/utils.js do?' }];
try {
  for (let turn = 1; turn <= 5; turn++) {
    const reply = fakeLLM(messages);
    messages.push(reply);
    const call = reply.content.find((b) => b.type === 'toolCall');
    if (!call) {
      console.log('turn ' + turn + ': model answers: ' + reply.content[0].text);
      break;
    }
    const args = JSON.stringify(call.arguments);
    console.log('turn ' + turn + ': model calls ' + call.name + ' ' + args);
    const res = executeToolCall(call);
    messages.push(res);
    console.log('   -> isError=' + res.isError + ' ' + res.content[0].text.slice(0, 60));
  }
} catch (err) {
  console.error('HARNESS CRASHED: ' + err.message);
}
document.getElementById('root').innerHTML =
  '<p>' + messages.length + ' messages. Errors returned to the model: ' +
  messages.filter((m) => m.isError).length + '</p>';`,
        explain: `
          <details>
            <summary>The problem: one bad call must not end the whole task</summary>
            <p>The user wrote <code>src/utils.js</code>, but the file is really
            <code>src/util.js</code>. The model also uses the wrong argument name
            (<code>file</code> instead of <code>path</code>). Set <code>CATCH_ERRORS = false</code>
            and run it:</p>
            <table>
              <tr><th>Turn</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>Model calls <code>read {"file":"src/utils.js"}</code></td>
                <td><code>turn 1: model calls read {"file":"src/utils.js"}</code></td></tr>
              <tr><td>1</td><td><code>validate</code> throws and nothing catches it</td>
                <td><code>HARNESS CRASHED: Validation failed for tool "read": missing property "path". ...</code></td></tr>
            </table>
            <p>The model never learns what went wrong, and the user gets no answer.</p>
          </details>
          <details>
            <summary>The fix: every failure becomes an <code>isError</code> result</summary>
            <pre><code>if (!tool) throw new Error('Tool ' + call.name + ' not found'); // ① unknown tool
validate(call.name, tool, call.arguments);                     // ② schema check first
...
} catch (err) {
  return result(err.message, true);                            // ③ error goes back as a message
}</code></pre>
            <ol>
              <li><strong>①</strong> An unknown tool name is handled like any other failure. Pi's message is the same: <code>Tool X not found</code>.</li>
              <li><strong>②</strong> Arguments are checked <em>before</em> <code>execute</code> runs,
              so a tool never gets <code>undefined</code> where it expected a path.</li>
              <li><strong>③</strong> The error text goes into a toolResult with <code>isError: true</code>,
              which still has the right <code>toolCallId</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Step by step: the model corrects itself (<code>CATCH_ERRORS = true</code>)</summary>
            <table>
              <tr><th>Turn</th><th>Model sends</th><th>Tool result</th><th>Console</th></tr>
              <tr><td>1</td><td><code>read {"file":"src/utils.js"}</code></td><td>isError, validation failed</td>
                <td><code>turn 1: model calls read {"file":"src/utils.js"}</code><br>
                <code>-&gt; isError=true Validation failed for tool "read": missing property "path".</code></td></tr>
              <tr><td>2</td><td><code>read {"path":"src/utils.js"}</code> (fixed the key)</td><td>isError, ENOENT + file list</td>
                <td><code>turn 2: model calls read {"path":"src/utils.js"}</code><br>
                <code>-&gt; isError=true ENOENT: no such file: src/utils.js. Files that exist: src/ut</code></td></tr>
              <tr><td>3</td><td><code>read {"path":"src/util.js"}</code> (picked from the list)</td><td>file contents</td>
                <td><code>turn 3: model calls read {"path":"src/util.js"}</code><br>
                <code>-&gt; isError=false export const slugify = (s) =&gt; s.toLowerCase().split(" ").joi</code></td></tr>
              <tr><td>4</td><td>text answer</td><td>none, so the loop stops</td>
                <td><code>turn 4: model answers: slugify lowercases the text and replaces spaces with dashes.</code></td></tr>
            </table>
            <p>Result lines are cut to 60 characters by <code>.slice(0, 60)</code>. The preview
            shows <code>8 messages. Errors returned to the model: 2</code>.</p>
            <div class="tip">The model fixed its second mistake only because the error message
            listed the files that exist. Write tool errors that suggest the next step.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'The model calls <code>read</code> with a path that does not exist. What should the harness do?',
        options: [
          'Throw and stop the run',
          'Return a toolResult with <code>isError: true</code> and a helpful message',
          'Skip the tool call silently',
          'Retry the same call forever',
        ],
        answer: 1,
        why: 'The error becomes a normal message the model can react to. Pi\'s loop catches exceptions from <code>execute()</code> and does exactly this.',
      },
      {
        q: 'When does pi check tool arguments against the schema?',
        options: [
          'After the tool runs',
          'Before the tool runs; failures return "Validation failed for tool ..."',
          'Never, the model is trusted',
          'Only for bash',
        ],
        answer: 1,
        why: '<code>prepareToolCall</code> runs <code>validateToolArguments</code> first. A failed check produces an error result and <code>execute</code> never runs.',
      },
      {
        q: 'What does the model receive if it calls a tool named <code>deploy</code> that isn\'t registered?',
        options: [
          'Nothing; the call is dropped',
          'An error toolResult: <code>Tool deploy not found</code>',
          'The harness crashes',
          'A new tool is created automatically',
        ],
        answer: 1,
        why: 'Pi returns an immediate error result with that text and <code>isError: true</code>.',
      },
      {
        q: 'Pi\'s bash tool runs <code>npm test</code> and it exits with code 1. What is the result?',
        options: [
          'A success result, because the command did run',
          'An error result (<code>isError: true</code>) ending with "Command exited with code 1"',
          'The harness throws and ends the run',
          'The output is discarded',
        ],
        answer: 1,
        why: 'A non-zero exit is reported to the model as an error result that still includes the output, so it can read the failing test.',
      },
    ],
    exercise: {
      task: `<p><code>executeToolCall</code> catches errors but returns an <strong>empty,
      non-error</strong> result, so the model gives up. Change the <code>catch</code> block to
      return the error message with <code>isError: true</code>. The model should then
      correct the path and answer.</p>`,
      starter: `const fs = { 'docs/setup.md': 'Run npm install, then npm start.' };

function read(args) {
  if (!(args.path in fs)) {
    const files = Object.keys(fs).join(', ');
    throw new Error('File not found: ' + args.path + '. Try: ' + files);
  }
  return fs[args.path];
}

function executeToolCall(call) {
  try {
    const text = read(call.arguments);
    return { role: 'toolResult', toolCallId: call.id, toolName: call.name,
      content: [{ type: 'text', text }], isError: false };
  } catch (err) {
    // TODO: send the error back to the model properly
    return { role: 'toolResult', toolCallId: call.id, toolName: call.name,
      content: [{ type: 'text', text: '' }], isError: false };
  }
}

let n = 0;
function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  const call = (path) => ({ role: 'assistant', stopReason: 'toolUse',
    content: [{ type: 'toolCall', id: 'c' + ++n, name: 'read', arguments: { path } }] });
  const say = (text) => ({ role: 'assistant', stopReason: 'stop',
    content: [{ type: 'text', text }] });

  if (last.role === 'user') return call('README.md');
  const text = last.content[0].text;
  if (last.isError) return call(text.split('Try: ')[1].split(', ')[0]);
  if (text === '') return say('The tool returned nothing. I give up.');
  return say('Setup: ' + text);
}

const messages = [{ role: 'user', content: 'How do I set up this project?' }];
for (let turn = 1; turn <= 4; turn++) {
  const reply = fakeLLM(messages);
  messages.push(reply);
  const c = reply.content.find((b) => b.type === 'toolCall');
  if (!c) {
    console.log('model: ' + reply.content[0].text);
    break;
  }
  const res = executeToolCall(c);
  console.log('read ' + c.arguments.path + ' -> isError=' + res.isError);
  messages.push(res);
}`,
      hint: 'In the catch block use text: err.message and isError: true.',
      solution: `const fs = { 'docs/setup.md': 'Run npm install, then npm start.' };

function read(args) {
  if (!(args.path in fs)) {
    const files = Object.keys(fs).join(', ');
    throw new Error('File not found: ' + args.path + '. Try: ' + files);
  }
  return fs[args.path];
}

function executeToolCall(call) {
  try {
    const text = read(call.arguments);
    return { role: 'toolResult', toolCallId: call.id, toolName: call.name,
      content: [{ type: 'text', text }], isError: false };
  } catch (err) {
    return { role: 'toolResult', toolCallId: call.id, toolName: call.name,
      content: [{ type: 'text', text: err.message }], isError: true };
  }
}

let n = 0;
function fakeLLM(messages) {
  const last = messages[messages.length - 1];
  const call = (path) => ({ role: 'assistant', stopReason: 'toolUse',
    content: [{ type: 'toolCall', id: 'c' + ++n, name: 'read', arguments: { path } }] });
  const say = (text) => ({ role: 'assistant', stopReason: 'stop',
    content: [{ type: 'text', text }] });

  if (last.role === 'user') return call('README.md');
  const text = last.content[0].text;
  if (last.isError) return call(text.split('Try: ')[1].split(', ')[0]);
  if (text === '') return say('The tool returned nothing. I give up.');
  return say('Setup: ' + text);
}

const messages = [{ role: 'user', content: 'How do I set up this project?' }];
for (let turn = 1; turn <= 4; turn++) {
  const reply = fakeLLM(messages);
  messages.push(reply);
  const c = reply.content.find((b) => b.type === 'toolCall');
  if (!c) {
    console.log('model: ' + reply.content[0].text);
    break;
  }
  const res = executeToolCall(c);
  console.log('read ' + c.arguments.path + ' -> isError=' + res.isError);
  messages.push(res);
}`,
    },
  },

  // ------------------------------------------------------------------ parallel-tools
  {
    id: 'parallel-tools',
    section: 'Tool Use',
    title: 'Multiple tool calls in one turn',
    explain: `
      <p>One assistant message can contain <strong>several</strong> <code>toolCall</code>
      blocks, for example "read a.js, b.js and c.js". The harness must return a result for
      <em>each</em> one, matched by <code>toolCallId</code>, before it calls the model again.</p>
      <p>By default pi's agent loop runs them <strong>in parallel</strong>
      (<code>toolExecution: "parallel"</code>):</p>
      <ul>
        <li>It checks each call in order (does the tool exist, are the arguments valid) and
        emits <code>tool_execution_start</code> for each.</li>
        <li>It runs the allowed calls <strong>at the same time</strong>. Each
        <code>tool_execution_end</code> fires when that tool <em>finishes</em>, so fast tools
        finish first.</li>
        <li>It appends the toolResult messages in the <strong>original order</strong> of the
        calls, not the order they finished.</li>
      </ul>
      <p>A tool can opt out with <code>executionMode: "sequential"</code>, and the whole loop
      can be set to <code>"sequential"</code>. Pi's file-changing tools (<code>edit</code>,
      <code>write</code>) also go through a per-file queue, so two edits to the same file never
      run into each other.</p>
      <div class="tip">Running in parallel saves time: three 200ms reads take about 200ms
      instead of 600ms. Keeping results in the original order keeps the transcript stable
      and easy to read.</div>
    `,
    examples: [
      {
        title: 'Three reads, run in parallel, results kept in order',
        code: `const fs = { 'a.txt': 'alpha', 'b.txt': 'bravo', 'c.txt': 'charlie' };
const DELAY = { 'a.txt': 300, 'b.txt': 100, 'c.txt': 200 }; // pretend disk speed

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One assistant message, three toolCall blocks
const reply = {
  role: 'assistant',
  content: [
    { type: 'text', text: 'Reading all three files.' },
    { type: 'toolCall', id: 'call_a', name: 'read', arguments: { path: 'a.txt' } },
    { type: 'toolCall', id: 'call_b', name: 'read', arguments: { path: 'b.txt' } },
    { type: 'toolCall', id: 'call_c', name: 'read', arguments: { path: 'c.txt' } },
  ],
  stopReason: 'toolUse',
};

async function runRead(call) {
  const path = call.arguments.path;
  await sleep(DELAY[path]);
  console.log('tool_execution_end   ' + call.id + ' (' + DELAY[path] + 'ms)');
  return {
    role: 'toolResult',
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: 'text', text: fs[path] }],
    isError: false,
  };
}

const calls = reply.content.filter((b) => b.type === 'toolCall');
const t0 = Date.now();

for (const call of calls) console.log('tool_execution_start ' + call.id); // ①
const results = await Promise.all(calls.map(runRead)); // ②

const took = Math.round((Date.now() - t0) / 100) * 100;
console.log('all done in ~' + took + 'ms');
console.log('toolResult order: ' + results.map((r) => r.toolCallId).join(', ')); // ③

document.getElementById('root').innerHTML = results
  .map((r) => '<div>' + r.toolCallId + ' -> ' + r.content[0].text + '</div>')
  .join('');`,
        explain: `
          <details>
            <summary>Step by step: finish order vs result order</summary>
            <table>
              <tr><th>Time</th><th>What happens</th><th>Console</th></tr>
              <tr><td>0ms</td><td>All three calls start (①)</td>
                <td><code>tool_execution_start call_a</code><br><code>tool_execution_start call_b</code><br><code>tool_execution_start call_c</code></td></tr>
              <tr><td>100ms</td><td>b.txt finishes first</td><td><code>tool_execution_end   call_b (100ms)</code></td></tr>
              <tr><td>200ms</td><td>c.txt finishes</td><td><code>tool_execution_end   call_c (200ms)</code></td></tr>
              <tr><td>300ms</td><td>a.txt finishes; <code>Promise.all</code> resolves (②)</td>
                <td><code>tool_execution_end   call_a (300ms)</code><br><code>all done in ~300ms</code></td></tr>
              <tr><td>300ms</td><td>Results in the original call order (③)</td>
                <td><code>toolResult order: call_a, call_b, call_c</code></td></tr>
            </table>
            <p><code>Promise.all</code> returns results in the order of the input array, even
            though they finished b, c, a. Pi does the same: end events come in finish order and
            toolResult messages in source order.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <p>Replace line ② with a sequential loop:</p>
            <pre><code>const results = [];
for (const call of calls) results.push(await runRead(call));</code></pre>
            <p>Now the end events come in order a, b, c and the run takes about
            <code>600ms</code>. That's the cost of running one at a time.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'An assistant message has 3 toolCall blocks. How many toolResult messages must follow before the next model call?',
        options: ['1', '3', 'Only the ones that succeed', '0'],
        answer: 1,
        why: 'Every call needs a result with its <code>toolCallId</code>, including failures (as <code>isError</code> results).',
      },
      {
        q: 'In pi\'s default parallel mode, in what order are toolResult messages added to the context?',
        options: [
          'In the order the tools finished',
          'In the original order of the toolCall blocks',
          'Random',
          'Alphabetically by tool name',
        ],
        answer: 1,
        why: '<code>tool_execution_end</code> events fire in finish order, but result messages are appended in assistant source order.',
      },
      {
        q: 'Why does pi run file mutations through a per-file queue?',
        options: [
          'To make them slower',
          'So two parallel edit/write calls on the same file do not clobber each other',
          'Because the model requires it',
          'To save tokens',
        ],
        answer: 1,
        why: '<code>withFileMutationQueue</code> serialises changes to the same file, even when tools run in parallel.',
      },
    ],
    exercise: {
      task: `<p>Implement <code>runSequential(calls)</code>: await each call one after another
      and collect the results. Compare its time with <code>runParallel</code>. It should print
      about <code>600ms</code> for sequential and about <code>300ms</code> for parallel.</p>`,
      starter: `const DELAY = { 'a.txt': 300, 'b.txt': 100, 'c.txt': 200 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calls = ['a.txt', 'b.txt', 'c.txt'].map((path, i) => ({
  type: 'toolCall', id: 'call_' + i, name: 'read', arguments: { path },
}));

async function runRead(call) {
  await sleep(DELAY[call.arguments.path]);
  return { role: 'toolResult', toolCallId: call.id, content: [], isError: false };
}

async function runParallel(calls) {
  return Promise.all(calls.map(runRead));
}

async function runSequential(calls) {
  const results = [];
  // TODO: await runRead(call) for each call, one at a time
  return results;
}

async function time(label, fn) {
  const t0 = Date.now();
  const results = await fn(calls);
  const ms = Math.round((Date.now() - t0) / 100) * 100;
  console.log(label + ': ' + results.length + ' results in ~' + ms + 'ms');
}

await time('parallel  ', runParallel);
await time('sequential', runSequential);`,
      hint: 'for (const call of calls) results.push(await runRead(call));',
      solution: `const DELAY = { 'a.txt': 300, 'b.txt': 100, 'c.txt': 200 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calls = ['a.txt', 'b.txt', 'c.txt'].map((path, i) => ({
  type: 'toolCall', id: 'call_' + i, name: 'read', arguments: { path },
}));

async function runRead(call) {
  await sleep(DELAY[call.arguments.path]);
  return { role: 'toolResult', toolCallId: call.id, content: [], isError: false };
}

async function runParallel(calls) {
  return Promise.all(calls.map(runRead));
}

async function runSequential(calls) {
  const results = [];
  for (const call of calls) {
    results.push(await runRead(call));
  }
  return results;
}

async function time(label, fn) {
  const t0 = Date.now();
  const results = await fn(calls);
  const ms = Math.round((Date.now() - t0) / 100) * 100;
  console.log(label + ': ' + results.length + ' results in ~' + ms + 'ms');
}

await time('parallel  ', runParallel);
await time('sequential', runSequential);`,
    },
  },

  // ------------------------------------------------------------------ pi-builtin-tools
  {
    id: 'pi-builtin-tools',
    section: 'Tool Use',
    title: "Pi's built-in tools",
    explain: `
      <p>Pi comes with a small, deliberate toolset. With default settings the model gets
      <strong>four</strong> tools: <code>read</code>, <code>bash</code>, <code>edit</code>,
      <code>write</code>. Pi also has <code>grep</code>, <code>find</code> and <code>ls</code>
      (plus <code>powershell</code> for Windows), which you turn on with <code>--tools</code> or
      the <code>defaultTools</code> setting.</p>
      <table>
        <tr><th>Tool</th><th>Parameters</th><th>What it does</th></tr>
        <tr><td><code>read</code></td><td><code>path</code>, <code>offset?</code>, <code>limit?</code></td>
          <td>Reads a text file (or an image as an attachment). <code>offset</code> is 1-indexed.</td></tr>
        <tr><td><code>bash</code></td><td><code>command</code>, <code>timeout?</code> (seconds)</td>
          <td>Runs a shell command in the working directory and returns stdout + stderr.</td></tr>
        <tr><td><code>edit</code></td><td><code>path</code>, <code>edits: [{ oldText, newText }]</code></td>
          <td>Exact text replacement. Each <code>oldText</code> must appear <strong>exactly once</strong> in the original file.</td></tr>
        <tr><td><code>write</code></td><td><code>path</code>, <code>content</code></td>
          <td>Creates or overwrites a whole file and creates parent folders if needed.</td></tr>
        <tr><td><code>grep</code></td><td><code>pattern</code>, <code>path?</code>, <code>glob?</code>, <code>ignoreCase?</code>, <code>literal?</code>, <code>context?</code>, <code>limit?</code></td>
          <td>Searches file contents and respects .gitignore. Default is 100 matches.</td></tr>
        <tr><td><code>find</code></td><td><code>pattern</code> (glob), <code>path?</code>, <code>limit?</code></td>
          <td>Finds files by glob and respects .gitignore. Default is 1000 results.</td></tr>
        <tr><td><code>ls</code></td><td><code>path?</code>, <code>limit?</code></td>
          <td>Lists a directory, including dotfiles, with <code>/</code> after directories. Default is 500 entries.</td></tr>
      </table>
      <h3>Why <code>edit</code> is exact find-and-replace</h3>
      <p>The model doesn't send line numbers or a diff. It quotes the exact text to change
      (<code>oldText</code>) and the new text (<code>newText</code>). This holds up well
      because line numbers change after every edit, while quoted text is easy to check. If
      the text isn't found, or appears more than once, the tool fails with a clear message
      and the model tries again with more context. You can pass several
      <code>edits</code> in one call. Each one is matched against the <em>original</em>
      file, and they must not overlap.</p>
      <h3>Output truncation protects the context window</h3>
      <p>A 20MB log would use up the whole context budget. Pi truncates at <strong>2000 lines
      or 50KB</strong>, whichever comes first:</p>
      <ul>
        <li><code>read</code> keeps the <strong>start</strong> of the file and adds a notice
        like <code>[Showing lines 1-2000 of 9000. Use offset=2001 to continue.]</code></li>
        <li><code>bash</code> keeps the <strong>end</strong> of the output (errors are usually
        at the bottom) and saves the full output to a temp file.</li>
        <li><code>grep</code> also cuts each match line to 500 characters.</li>
      </ul>
      <pre><code># Choose which tools the model gets (pi CLI)
pi --tools read,grep,find,ls --print "Review this project"   # read-only review
pi --exclude-tools bash                                      # everything default except bash</code></pre>
      <div class="warn">"Read-only tools" only limits what the <em>model can ask for</em>.
      It isn't a sandbox. With <code>bash</code> enabled the model can run any command your
      user account can run.</div>
    `,
    examples: [
      {
        title: 'In-memory read / edit / write / bash-lite',
        code: `const fs = {
  'src/greet.js': 'export function greet(name) {\\n  return "Hello " + name;\\n}',
  'big.log': Array.from({ length: 12 }, (_, i) => 'log line ' + (i + 1)).join('\\n'),
};
const MAX_LINES = 5; // pi uses 2000 lines or 50KB

const tools = {
  read({ path, offset, limit }) {
    if (!(path in fs)) throw new Error('ENOENT: no such file or directory: ' + path);
    const lines = fs[path].split('\\n');
    const start = offset ? offset - 1 : 0;
    const count = Math.min(limit ?? MAX_LINES, MAX_LINES);
    const shown = lines.slice(start, start + count);
    const end = start + shown.length;
    let text = shown.join('\\n');
    if (end < lines.length) {
      text += '\\n[Showing lines ' + (start + 1) + '-' + end + ' of ' + lines.length +
        '. Use offset=' + (end + 1) + ' to continue.]';
    }
    return text;
  },

  write({ path, content }) {
    fs[path] = content;
    return 'Successfully wrote to ' + path;
  },

  edit({ path, edits }) {
    const original = fs[path];
    let updated = original;
    for (const { oldText, newText } of edits) {
      const count = original.split(oldText).length - 1; // matched against the ORIGINAL
      if (count === 0) {
        throw new Error('Could not find the exact text in ' + path +
          '. The old text must match exactly including all whitespace and newlines.');
      }
      if (count > 1) {
        throw new Error('Found ' + count + ' occurrences of the text in ' + path +
          '. The text must be unique. Please provide more context to make it unique.');
      }
      updated = updated.replace(oldText, newText);
    }
    fs[path] = updated;
    return 'Successfully replaced ' + edits.length + ' block(s) in ' + path + '.';
  },

  bash({ command }) {
    const [cmd, arg] = command.split(' ');
    if (cmd === 'ls') return Object.keys(fs).join('\\n');
    if (cmd === 'cat' && arg in fs) return fs[arg];
    const out = 'bash: ' + cmd + ': command not found';
    throw new Error(out + '\\n\\nCommand exited with code 127');
  },
};

// Run a tool the way a harness would: errors become isError results
function call(name, args) {
  try {
    const text = tools[name](args);
    console.log('OK   ' + name + ' ' + JSON.stringify(args) + '\\n' + text);
  } catch (err) {
    console.log('ERR  ' + name + ' ' + JSON.stringify(args) + '\\n' + err.message);
  }
}

call('read', { path: 'big.log' });
call('read', { path: 'big.log', offset: 6, limit: 2 });
const file = 'src/greet.js';
call('edit', { path: file, edits: [{ oldText: '"Hello "', newText: '"Hi, "' }] });
call('edit', { path: file, edits: [{ oldText: '"Hello "', newText: '"Hey "' }] });
call('edit', { path: file, edits: [{ oldText: 'name', newText: 'who' }] });
call('write', { path: 'src/new.js', content: 'export default 42;' });
call('bash', { command: 'ls' });
call('bash', { command: 'pytest' });

document.getElementById('root').innerHTML =
  '<pre style="font-size:12px;">src/greet.js now:\\n' + fs['src/greet.js'] + '</pre>';`,
        explain: `
          <details>
            <summary>What each call shows</summary>
            <table>
              <tr><th>Call</th><th>Result</th><th>Lesson</th></tr>
              <tr><td><code>read big.log</code></td><td>lines 1-5 + <code>[Showing lines 1-5 of 12. Use offset=6 to continue.]</code></td>
                <td>Truncation tells the model how to get the rest</td></tr>
              <tr><td><code>read offset 6, limit 2</code></td><td>lines 6-7 + <code>Use offset=8</code></td><td>Paging through a big file</td></tr>
              <tr><td><code>edit "Hello " → "Hi, "</code></td><td><code>Successfully replaced 1 block(s)</code></td><td>Unique exact match works</td></tr>
              <tr><td>same edit again</td><td><code>Could not find the exact text ...</code></td><td>The text is gone now, so the model must re-read</td></tr>
              <tr><td><code>edit "name"</code></td><td><code>Found 2 occurrences ...</code></td><td>Ambiguous: quote more context</td></tr>
              <tr><td><code>bash pytest</code></td><td><code>command not found ... exited with code 127</code></td><td>Non-zero exit becomes an error result</td></tr>
            </table>
            <p>The error texts are copied from pi's <code>edit-diff.ts</code> and
            <code>bash.ts</code>. Pi's real edit tool also normalises line endings, strips a BOM
            and returns a diff for the UI. The read tool's truncation notice for the
            <code>limit</code> case is worded a little differently.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Which tools does pi give the model with default settings?',
        options: [
          '<code>read</code>, <code>bash</code>, <code>edit</code>, <code>write</code>',
          '<code>read</code>, <code>grep</code>, <code>find</code>, <code>ls</code>',
          'All eight built-ins',
          'None until you configure them',
        ],
        answer: 0,
        why: '<code>DEFAULT_TOOL_NAMES</code> is <code>["read", "bash", "edit", "write"]</code>. grep/find/ls are available through <code>--tools</code> or <code>defaultTools</code>.',
      },
      {
        q: 'What are the edit tool\'s parameters?',
        options: [
          '<code>path</code>, <code>line</code>, <code>content</code>',
          '<code>path</code>, <code>edits: [{ oldText, newText }]</code>',
          '<code>file</code>, <code>diff</code>',
          '<code>path</code>, <code>regex</code>, <code>replacement</code>',
        ],
        answer: 1,
        why: 'Each <code>oldText</code> must match a unique region of the original file exactly. (Pi still accepts an older top-level oldText/newText form for compatibility.)',
      },
      {
        q: 'An edit\'s <code>oldText</code> appears 3 times in the file. What happens?',
        options: [
          'All 3 are replaced',
          'The first is replaced',
          'The tool fails: "Found 3 occurrences ... Please provide more context"',
          'Pi asks the user',
        ],
        answer: 2,
        why: 'Uniqueness is required, so the model has to quote enough surrounding text to pick one spot.',
      },
      {
        q: 'A command prints 10,000 lines. What does pi\'s bash tool send to the model?',
        options: [
          'All 10,000 lines',
          'The first 2000 lines',
          'The last 2000 lines (or 50KB), with the full output saved to a temp file',
          'Nothing',
        ],
        answer: 2,
        why: 'bash keeps the tail because errors and summaries are usually at the end. read does the opposite and keeps the head.',
      },
    ],
    exercise: {
      task: `<p>Implement an in-memory <code>grep({ pattern, ignoreCase })</code> that searches
      every file in <code>fs</code> and returns lines formatted as
      <code>path:lineNumber: text</code> (1-indexed), joined by newlines. If nothing matches,
      return <code>No matches found</code>.</p>`,
      starter: `const fs = {
  'src/a.js': 'const x = 1;\\n// TODO: remove\\nexport default x;',
  'src/b.js': 'import x from "./a.js";\\n// todo: test this',
  'README.md': '# Project',
};

function grep({ pattern, ignoreCase }) {
  const out = [];
  // TODO: for each file, for each line, push "path:lineNo: line" when it matches
  return out.length ? out.join('\\n') : 'No matches found';
}

console.log('--- TODO');
console.log(grep({ pattern: 'TODO' }));
console.log('--- todo, ignoreCase');
console.log(grep({ pattern: 'todo', ignoreCase: true }));
console.log('--- banana');
console.log(grep({ pattern: 'banana' }));`,
      hint: 'Object.entries(fs), then content.split("\\n").forEach((line, i) => ...). For ignoreCase, compare line.toLowerCase() with pattern.toLowerCase().',
      solution: `const fs = {
  'src/a.js': 'const x = 1;\\n// TODO: remove\\nexport default x;',
  'src/b.js': 'import x from "./a.js";\\n// todo: test this',
  'README.md': '# Project',
};

function grep({ pattern, ignoreCase }) {
  const out = [];
  const needle = ignoreCase ? pattern.toLowerCase() : pattern;
  for (const [path, content] of Object.entries(fs)) {
    content.split('\\n').forEach((line, i) => {
      const hay = ignoreCase ? line.toLowerCase() : line;
      if (hay.includes(needle)) out.push(path + ':' + (i + 1) + ': ' + line);
    });
  }
  return out.length ? out.join('\\n') : 'No matches found';
}

console.log('--- TODO');
console.log(grep({ pattern: 'TODO' }));
console.log('--- todo, ignoreCase');
console.log(grep({ pattern: 'todo', ignoreCase: true }));
console.log('--- banana');
console.log(grep({ pattern: 'banana' }));`,
    },
  },
);
