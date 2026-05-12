const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const tools = require("./tools");
const { ToolMessage, AIMessage, HumanMessage } = require("@langchain/core/messages");

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.2
});

const graph = new StateGraph(MessagesAnnotation)
    .addNode("tools", async (state, config) => {

        const lastMessage = state.messages[state.messages.length - 1];
        const toolsCall = lastMessage.tool_Calls;
        const toolCallResults = await Promise.all(toolsCall.map(async (call) => {
            const tool = tools[call.name];
            if (!tool) {
                return `Tool ${call.name} not found.`;
            }

            const toolInput = call.args;

            const toolResult = await tool.func({ ...toolInput, token: config.metadata.token });

            return new ToolMessage({
                content: toolResult,
                name: call.name
            });
        }));

        state.messages.push(toolCallResults);

        return state;
    })
    .addNode("chats", async (state, config) => {
        const response = await model.invoke(state.messages, { tools: [tools.searchProduct, tools.addtoCart] });

        state.messages.push(new AIMessage({ tool_Calls: response.tool_calls, content: response.text }))

        return state;
    })
    .addEdge("__start__", "chats")
    .addConditionalEdges("chats", async (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage.tool_Calls) {
            return "tools";
        }

        return "__end__";
    })
    .addEdge("tools", "chats")

const agent = graph.compile();

module.exports = agent;
