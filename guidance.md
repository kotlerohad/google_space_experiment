I am writing here the guidance on how the email triaging process needs to work in full. 
1. key integrations: 
- Gmail email fetching 
- Calendar fetching 
- Supabase functionalities 
- Gmail email drafting

2. general triage approach 
- When triaging, we look into our database to see if the contact is someone we need more context on
- answers should include level of confidence on a 1-10 scale. when confidence of 9+ is for archieve, and more than 2 hours have passed, we shuold trigger archiving. When it's 7 and above in that a draft is needed, go ahead and create a draft
- the output of the triage will include a 1 word key point of the takeaway - we should have a list of potential values there (e.g., Schedule, Respond, Update_database, Archieve .. )
 
3. triage results
a. clear up noise - things like invites that were accepted or "welcome to.." and other basic notifications shuold be captured with high degree of confidence as something to be archived. 
b. check calendar - if there's an calendar related input we need to get to my calendar and see if it would be possible to accomodate the request. also, if we need to suggest times that fit, we should be able to include that in our draft answer.
c. check supabase - many emails should relate to contacts in supabase and should lead to updates to the database. furthermore in supabase we'll be holding a view on the activities and when an email has been recieved that could trigger for an activity being completed or required
d. draft answers - the agent would never send out an email, but whenever appropriate it should draft a resoponse on my behalf. it could be as easy as a thank you for the update. i should get a visual queue in the screen to see that a draft was created 



4. Feedback loop
- i will manually review triage results often and provide feedback. the human in the loop feedback is of high value, and needs to be stored in supabase with email_recieved, feedback, expected_output. this should become part of our prompts over time, but managed carefully 
- we shuold use these to be added to the system prompt as examples, and also update 
