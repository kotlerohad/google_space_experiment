-- LinkedIn URL Updates for Contacts
-- Generated based on provided LinkedIn data
-- This script updates existing contacts with their LinkedIn URLs

-- Update contacts with LinkedIn URLs
-- Format: UPDATE contacts SET linkedin_url = 'URL' WHERE id = ID;

UPDATE contacts SET linkedin_url = 'https://il.linkedin.com/in/shay-dan-219902133' WHERE id = 2;
UPDATE contacts SET linkedin_url = 'https://il.linkedin.com/in/shani-federman-10543337' WHERE id = 3;
UPDATE contacts SET linkedin_url = 'https://il.linkedin.com/in/alon-sandak' WHERE id = 4;
UPDATE contacts SET linkedin_url = 'https://il.linkedin.com/in/motigoldklang' WHERE id = 6;
UPDATE contacts SET linkedin_url = 'https://il.linkedin.com/in/hadar-gecht-19556a1' WHERE id = 7;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/friso-westra-8b52021' WHERE id = 8;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/dannykoopman' WHERE id = 10;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/martijn-cappel-8205534' WHERE id = 11;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/l4abeekman' WHERE id = 12;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/brendanfyork' WHERE id = 13;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/namrata-sen-1a348b19' WHERE id = 14;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/bart-wolffensperger-1ba8191' WHERE id = 15;
UPDATE contacts SET linkedin_url = 'https://de.linkedin.com/in/steffenwentzel' WHERE id = 16;
UPDATE contacts SET linkedin_url = 'https://www.linkedin.com/in/rociolopezvalladolid' WHERE id = 17;
UPDATE contacts SET linkedin_url = 'https://be.linkedin.com/in/bahadir-samli-4a37a4a' WHERE id = 18;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/floris-onvlee-35a77821' WHERE id = 19;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/bholmthorsson' WHERE id = 20;
UPDATE contacts SET linkedin_url = 'https://www.linkedin.com/in/marco-santarelli-27b9231' WHERE id = 21;
UPDATE contacts SET linkedin_url = 'https://be.linkedin.com/in/dr-barak-chizi-5745a86' WHERE id = 22;
UPDATE contacts SET linkedin_url = 'https://dk.linkedin.com/in/shekharashish' WHERE id = 23;
UPDATE contacts SET linkedin_url = 'https://no.linkedin.com/in/larsgaustadte' WHERE id = 24;
UPDATE contacts SET linkedin_url = 'https://dk.linkedin.com/in/rodea' WHERE id = 25;
UPDATE contacts SET linkedin_url = 'https://nl.linkedin.com/in/marinusoosterbeek' WHERE id = 26;
UPDATE contacts SET linkedin_url = 'https://ch.linkedin.com/in/correa-javier' WHERE id = 27;
UPDATE contacts SET linkedin_url = 'https://it.linkedin.com/in/fedeselmi' WHERE id = 28;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/sabrine-waismann-a3465038' WHERE id = 30;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/joel-perlman-765b9688' WHERE id = 31;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/luketonin' WHERE id = 32;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/kirsty-rutter-6093771' WHERE id = 34;
UPDATE contacts SET linkedin_url = 'https://www.linkedin.com/in/arinray' WHERE id = 35;
UPDATE contacts SET linkedin_url = 'https://www.linkedin.com/in/tal-sigura' WHERE id = 36;
UPDATE contacts SET linkedin_url = 'https://www.linkedin.com/in/dov-b-katz' WHERE id = 37;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/mike1day' WHERE id = 38;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/carolina-s-douek-61b13284' WHERE id = 39;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/reema-deb-a188211a' WHERE id = 40;
UPDATE contacts SET linkedin_url = 'https://in.linkedin.com/in/kalambur-venkatraman-46575318' WHERE id = 41;
UPDATE contacts SET linkedin_url = 'https://jp.linkedin.com/in/yumi-goda-0a593279' WHERE id = 42;
UPDATE contacts SET linkedin_url = 'https://br.linkedin.com/in/oscar-vilcachagua-674243' WHERE id = 43;
UPDATE contacts SET linkedin_url = 'https://it.linkedin.com/in/jacopo-zaffaroni-5b416727' WHERE id = 44;
UPDATE contacts SET linkedin_url = 'https://be.linkedin.com/in/johansmessaert' WHERE id = 46;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/thomasfakhouri' WHERE id = 48;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/luca-kotton-4aa419128' WHERE id = 50;
UPDATE contacts SET linkedin_url = 'https://cz.linkedin.com/in/cto-mentor-architect' WHERE id = 51;
UPDATE contacts SET linkedin_url = 'https://fr.linkedin.com/in/patriceamann' WHERE id = 54;
UPDATE contacts SET linkedin_url = 'https://cy.linkedin.com/in/georgios-d-stephanides' WHERE id = 55;
UPDATE contacts SET linkedin_url = 'https://de.linkedin.com/in/bala-nagaraj-44008411' WHERE id = 56;
UPDATE contacts SET linkedin_url = 'https://uk.linkedin.com/in/angela-jorquera-kitchen-66444b58' WHERE id = 63;
UPDATE contacts SET linkedin_url = 'https://hu.linkedin.com/in/balazsa' WHERE id = 64;
UPDATE contacts SET linkedin_url = 'https://linkedin.com/in/michel-delaux' WHERE id = 65;
UPDATE contacts SET linkedin_url = 'https://de.linkedin.com/in/renehoegen' WHERE id = 66;
UPDATE contacts SET linkedin_url = 'https://fr.linkedin.com/in/luismiguelescudeiro' WHERE id = 67;
UPDATE contacts SET linkedin_url = 'https://ch.linkedin.com/in/thomasfromherz' WHERE id = 68;
UPDATE contacts SET linkedin_url = 'https://ch.linkedin.com/in/thomasfromherz' WHERE id = 72;
UPDATE contacts SET linkedin_url = 'https://www.linkedin.com/in/leopoldo-palazzi-trivelli-6a487a97' WHERE id = 73;

-- Optional: Set LinkedIn connection status to 'unknown' for newly added URLs
-- UPDATE contacts SET linkedin_connection_status = 'unknown' WHERE linkedin_url IS NOT NULL AND linkedin_connection_status IS NULL;

-- Verification queries to check the updates
-- SELECT id, name, linkedin_url FROM contacts WHERE linkedin_url IS NOT NULL ORDER BY id;
-- SELECT COUNT(*) as total_contacts_with_linkedin FROM contacts WHERE linkedin_url IS NOT NULL; 