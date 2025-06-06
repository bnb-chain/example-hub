import asyncio
import logging
import sys

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from bnb_chain_agentkit.agent_toolkits import BnbChainToolkit
from bnb_chain_agentkit.utils import BnbChainAPIWrapper

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("Chatbot")

console_handler = logging.StreamHandler()
logger.addHandler(console_handler)

load_dotenv()


def initialize_agent():
    """Initialize the agent with BNB Chain."""
    # Initialize LLM.
    llm = ChatOpenAI(model="gpt-4o")

    # Configure BNB Chain Langchain Extension.
    bnb_chain = BnbChainAPIWrapper()

    # Initialize BNB Chain Toolkit and get tools.
    bnb_chain_toolkit = BnbChainToolkit.from_bnb_chain_api_wrapper(bnb_chain)
    tools = bnb_chain_toolkit.get_tools()
    # print('Supported tools:')
    # for tool in tools:
    #     print(tool.name)

    # Store buffered conversation history in memory.
    memory = MemorySaver()
    config = {"configurable": {"thread_id": "BNB Chain Chatbot Example!"}}

    # Create React Agent using the LLM and BNB Chain tools.
    return (
        create_react_agent(
            llm,
            tools=tools,
            checkpointer=memory,
            prompt="You are a helpful agent that can interact onchain using the BNB Chain toolkit. You are empowered to interact onchain using your tools. If you ever need funds, you can provide your wallet details and request funds from the user. If someone asks you to do something you can't do with your currently available tools, you must say so, and encourage them to implement it themselves using the BNB Chain. Be concise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.",
        ),
        config,
    )


async def run_chat_mode(agent_executor, config):
    """Run the agent interactively based on user input."""
    print("Starting chat mode... Type 'exit' to end.")
    while True:
        try:
            user_input = input("\nUser: ")
            if user_input.lower() == "exit":
                break

            # Run agent with the user's input in chat mode
            async for event in agent_executor.astream(
                {"messages": [HumanMessage(content=user_input)]},
                config,
                stream_mode="values",
            ):
                event["messages"][-1].pretty_print()

        except KeyboardInterrupt:
            print("Goodbye Agent!")
            sys.exit(0)
        except EOFError:  # Catch EOFError for handling Ctrl+D
            print("Goodbye Agent!")
            sys.exit(0)


async def main():
    """Start the chatbot agent."""
    agent_executor, config = initialize_agent()
    await run_chat_mode(agent_executor=agent_executor, config=config)


if __name__ == "__main__":
    print("Starting Agent...")
    asyncio.run(main())
