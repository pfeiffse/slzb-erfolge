insert into public.sports(id,name,code,category,disciplines) values
('SP01','Basketball','BA','Mannschaftssport',array['Mannschaft']),
('SP09','Handball','HB','Mannschaftssport',array['Mannschaft']),
('SP10','Judo','JU','Kampfsport',array['Einzel','Mannschaft','Kata']),
('SP11','Leichtathletik','LA','Leichtathletik',array['100m Sprint','200m Sprint','400m','800m','1500m','4×100m Staffel']),
('SP14','Schwimmen','SW','Wassersport',array['50m Freistil','100m Freistil','200m Freistil'])
on conflict(id) do nothing;
