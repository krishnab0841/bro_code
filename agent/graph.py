import os
import queue as q_module

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langgraph.constants import END
from langgraph.graph import StateGraph
from langgraph.prebuilt import create_react_agent

from agent.prompts import planner_prompt, architect_prompt, coder_system_prompt
from agent.states import Plan, TaskPlan, CoderState
from agent.tools import write_file, read_file, get_current_directory, list_files, set_event_queue, init_project_root

_ = load_dotenv()

llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
    max_tokens=8096,
)


def _push_event(event_queue, event: dict):
    """Push an event to the queue if it exists."""
    if event_queue is not None:
        event_queue.put(event)


def build_graph(event_queue=None):
    """Factory function to build the LangGraph agent graph.

    Args:
        event_queue: Optional thread-safe queue for SSE event streaming.
                     When provided, agents push progress events to it.
    """
    # Set the event queue on the tools module so write_file can push events
    set_event_queue(event_queue)

    # Clean and init the project root
    init_project_root()

    def planner_agent(state: dict) -> dict:
        """Converts user prompt into a structured Plan."""
        _push_event(event_queue, {
            "type": "agent",
            "agent": "planner",
            "message": "🗺️ Planning your project..."
        })
        user_prompt = state["user_prompt"]
        resp = llm.with_structured_output(Plan).invoke(
            planner_prompt(user_prompt)
        )
        if resp is None:
            raise ValueError("Planner did not return a valid response.")
        _push_event(event_queue, {
            "type": "agent",
            "agent": "planner",
            "message": f"✅ Plan ready: {resp.name} — {resp.description}"
        })
        return {"plan": resp}

    def architect_agent(state: dict) -> dict:
        """Creates TaskPlan from Plan."""
        _push_event(event_queue, {
            "type": "agent",
            "agent": "architect",
            "message": "📐 Designing architecture and breaking down tasks..."
        })
        plan: Plan = state["plan"]
        resp = llm.with_structured_output(TaskPlan).invoke(
            architect_prompt(plan=plan.model_dump_json())
        )
        if resp is None:
            raise ValueError("Architect did not return a valid response.")

        resp.plan = plan
        _push_event(event_queue, {
            "type": "agent",
            "agent": "architect",
            "message": f"✅ Architecture ready: {len(resp.implementation_steps)} tasks planned"
        })
        return {"task_plan": resp}

    def coder_agent(state: dict) -> dict:
        """LangGraph tool-using coder agent."""
        coder_state: CoderState = state.get("coder_state")
        if coder_state is None:
            coder_state = CoderState(task_plan=state["task_plan"], current_step_idx=0)

        steps = coder_state.task_plan.implementation_steps
        if coder_state.current_step_idx >= len(steps):
            return {"coder_state": coder_state, "status": "DONE"}

        current_task = steps[coder_state.current_step_idx]
        _push_event(event_queue, {
            "type": "agent",
            "agent": "coder",
            "message": f"💻 Writing file ({coder_state.current_step_idx + 1}/{len(steps)}): {current_task.filepath}"
        })

        existing_content = read_file.invoke({"path": current_task.filepath})

        system_prompt = coder_system_prompt()
        user_prompt = (
            f"Task: {current_task.task_description}\n"
            f"File: {current_task.filepath}\n"
            f"Existing content:\n{existing_content}\n"
            "Use write_file(path, content) to save your changes."
        )

        coder_tools = [read_file, write_file, list_files, get_current_directory]
        react_agent = create_react_agent(llm, coder_tools)

        react_agent.invoke({"messages": [{"role": "system", "content": system_prompt},
                                         {"role": "user", "content": user_prompt}]})

        coder_state.current_step_idx += 1
        return {"coder_state": coder_state}

    graph = StateGraph(dict)

    graph.add_node("planner", planner_agent)
    graph.add_node("architect", architect_agent)
    graph.add_node("coder", coder_agent)

    graph.add_edge("planner", "architect")
    graph.add_edge("architect", "coder")
    graph.add_conditional_edges(
        "coder",
        lambda s: "END" if s.get("status") == "DONE" else "coder",
        {"END": END, "coder": "coder"}
    )

    graph.set_entry_point("planner")
    return graph.compile()


# Default agent instance for CLI usage
agent = build_graph()

if __name__ == "__main__":
    result = agent.invoke({"user_prompt": "Build a colourful modern todo app in html css and js"},
                          {"recursion_limit": 100})
    print("Final State:", result)
