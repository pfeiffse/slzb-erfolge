-- Abstimmungs-Tabellen für anonyme Besucher lesbar machen
CREATE POLICY widget_voting_campaigns ON voting_campaigns
  FOR SELECT TO anon
  USING (status IN ('aktiv', 'beendet'));

CREATE POLICY widget_voting_candidates ON voting_candidates
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM voting_campaigns c
    WHERE c.id = voting_candidates.campaign_id
      AND c.status IN ('aktiv', 'beendet')
  ));

CREATE POLICY widget_voting_votes_read ON voting_votes
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM voting_campaigns c
    WHERE c.id = voting_votes.campaign_id
      AND c.status IN ('aktiv', 'beendet')
  ));

GRANT SELECT ON public.voting_campaigns TO anon;
GRANT SELECT ON public.voting_candidates TO anon;
GRANT SELECT ON public.voting_votes TO anon;
