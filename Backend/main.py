# from agents.agent_chain import final_chain as user_chatBot

# print(user_chatBot.invoke("i need the best biginner to advanced dp problems i what the problems to link with each other so i can understand the dp problems better and i want to do them in leetcode"))


# from pyFiles.doc import doc_info

# print(doc_info("what is the person name, did he work in google"))


# # we need to make the use of the documnets like the user uploads the documnets and the agent can read the documnets and answer the questions based on the documnets
# # we can use the langchain_community.document_loaders to load the documnets
# # we can do that in another py file that extracts the text from the documnets and stores it in a vector store
# # then we can use the vector store to answer the questions based on the documnets

from agents.scheduler import generate_schedule, create_calendar_events, extract_context

context = extract_context("I Want to learn Python for 7 days")

print(context.model_dump())

schedule = generate_schedule(context)

print(schedule.model_dump())

# event_links = create_calendar_events(schedule, context)

# print("\n===== CALENDAR EVENT LINKS =====")
# for link in event_links:
#     print(link)

# from agents.scheduler import delete_all_future_events

# delete_all_future_events()