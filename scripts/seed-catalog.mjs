import { readFileSync } from "node:fs";
const products = ["products", "he-products"].flatMap(name =>
  JSON.parse(readFileSync(new URL("../src/data/" + name + ".json", import.meta.url)))
);
const json = JSON.stringify(products).replaceAll("'", "''");
console.log(`insert into public.store_products(id, product, status)
select p->>'id', p, coalesce(p->>'status','approved')
from jsonb_array_elements('${json}'::jsonb) p
on conflict(id) do nothing;`);
