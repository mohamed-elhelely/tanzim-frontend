"""
Fills a demo company with sample operations through the public API, so the explainer video has real screens:
catalog, two warehouses, suppliers and price lists, a full purchase cycle (order -> receipt -> matched invoice ->
payment), customers, sales orders at every stage (draft, confirmed, delivered + invoiced + paid), a customer
return closed with a credit note, a fiscal year and a posted rent expense.

Run it once on a local / staging database (it is not idempotent for documents):
  python seed_demo_data.py --api http://localhost:8000 --email owner@example.com --password ...
or set TANZIM_EMAIL / TANZIM_PASSWORD. The user must be a company admin of the target company.
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

TODAY = dt.date.today()
API = ""
TOKEN = ""


def call(method, path, body=None, ok=(200, 201)):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json",
                                          **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})})
    try:
        with urllib.request.urlopen(req) as r:
            payload = json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> {e.code}\n{e.read().decode('utf-8', 'replace')[:1500]}")
    return payload.get("data", payload) if isinstance(payload, dict) else payload


def get_all(path):
    data = call("GET", path + ("&" if "?" in path else "?") + "page_size=100")
    return data if isinstance(data, list) else data.get("results", data)


def find_or_create(path, match, body):
    for row in get_all(path):
        if all(str(row.get(k)["id"] if isinstance(row.get(k), dict) else row.get(k)) == str(v) for k, v in match.items()):
            return row
    return call("POST", path, body)


def action(path, name, **extra):
    return call("POST", path, {"action": name, **extra})


def main():
    global API, TOKEN
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--email", default=os.environ.get("TANZIM_EMAIL"))
    ap.add_argument("--password", default=os.environ.get("TANZIM_PASSWORD"))
    a = ap.parse_args()
    API = a.api.rstrip("/")
    login = call("POST", "/api/login/", {"email": a.email, "password": a.password})
    TOKEN = login.get("access") or login.get("access_token")

    inv, sales, ret, acc = "/api/inventory/v1", "/api/sales/v1", "/api/returns/v1", "/api/accounting/v1"

    # ---------- people and places already seeded ----------
    sites = get_all("/api/company/v1/location/")
    site = {s["code"]: s["id"] for s in sites}
    users = get_all("/api/company/v1/company-user/")
    by_email = {u["user"]["email"]: u["user"]["id"] for u in users if isinstance(u.get("user"), dict)}
    wh_manager = next((v for k, v in by_email.items() if k.startswith("mahmoud.")), None)

    # ---------- catalog ----------
    cats = {n: find_or_create(f"{inv}/category/", {"name": n}, {"name": n, "description": d})["id"]
            for n, d in [("Computers & IT", "Laptops, accessories and printing"),
                         ("Office Furniture", "Desks and chairs"), ("Stationery", "Paper and office supplies")]}
    brands = {n: find_or_create(f"{inv}/brand/", {"name": n}, {"name": n})["id"] for n in ["ProTech", "ErgoSeat", "PaperPlus"]}
    items = [  # name, category, brand, uom, sku, cost, price
        ("Business Laptop 14\"", "Computers & IT", "ProTech", "piece", "LAP-14-I5", "27000", "32500"),
        ("Wireless Mouse", "Computers & IT", "ProTech", "piece", "MOU-WL-01", "280", "450"),
        ("Laser Printer Toner 85A", "Computers & IT", "ProTech", "piece", "TON-85A", "1300", "1850"),
        ("Ergonomic Office Chair", "Office Furniture", "ErgoSeat", "piece", "CHR-ERG-01", "3200", "4600"),
        ("A4 Copy Paper (box of 5 reams)", "Stationery", "PaperPlus", "box", "PAP-A4-5R", "480", "650"),
    ]
    v = {}
    for name, cat, brand, uom, sku, cost, price in items:
        p = find_or_create(f"{inv}/product/", {"name": name},
                           {"name": name, "category": cats[cat], "brand": brands[brand], "product_type": "simple",
                            "default_uom": uom, "valuation_method": "average", "is_sellable": True, "is_purchasable": True})
        var = find_or_create(f"{inv}/product-variant/", {"sku": sku},
                             {"product": p["id"], "sku": sku, "name": name, "standard_cost": cost, "standard_price": price,
                              "barcode": f"622{abs(hash(sku)) % 10**10:010d}"})
        v[sku] = {"product": p["id"], "variant": var["id"], "cost": cost, "price": price}
    print("catalog ok")

    # ---------- warehouses ----------
    main_wh = find_or_create(f"{inv}/warehouse/", {"code": "MAIN"},
                             {"name": "Main Warehouse", "code": "MAIN", "warehouse_type": "central",
                              "location": site.get("NVT-WH1"), "manager": wh_manager, "city": "10th of Ramadan"})
    show_wh = find_or_create(f"{inv}/warehouse/", {"code": "SHOW"},
                             {"name": "Zamalek Showroom", "code": "SHOW", "warehouse_type": "retail",
                              "location": site.get("NVT-HQ1"), "city": "Cairo"})
    for code, name in [("A", "Zone A - IT"), ("B", "Zone B - Furniture")]:
        z = find_or_create(f"{inv}/zone/", {"code": code, "warehouse": main_wh["id"]},
                           {"warehouse": main_wh["id"], "name": name, "code": code})
        for i in (1, 2):
            find_or_create(f"{inv}/bin/", {"code": f"{code}-0{i}"}, {"zone": z["id"], "name": f"Shelf {code}-0{i}", "code": f"{code}-0{i}"})
    print("warehouses ok")

    # ---------- suppliers and price lists ----------
    sup_it = find_or_create(f"{inv}/supplier/", {"name": "Delta IT Distribution"},
                            {"name": "Delta IT Distribution", "contact_person": "Hossam Adel", "email": "sales@delta-it.example",
                             "phone": "+20 2 2345 6789", "city": "Cairo", "country": "Egypt", "payment_terms": "Net 30",
                             "lead_time_days": 5, "reliability_score": 0.95, "is_preferred": True, "currency": "EGP"})
    sup_off = find_or_create(f"{inv}/supplier/", {"name": "Cairo Office Supplies"},
                             {"name": "Cairo Office Supplies", "contact_person": "Laila Mahmoud", "email": "orders@cos.example",
                              "phone": "+20 2 2765 4321", "city": "Giza", "country": "Egypt", "payment_terms": "Net 15",
                              "lead_time_days": 3, "reliability_score": 0.9, "currency": "EGP"})
    plan = {sup_it["id"]: [("LAP-14-I5", 20), ("MOU-WL-01", 60), ("TON-85A", 30)],
            sup_off["id"]: [("CHR-ERG-01", 40), ("PAP-A4-5R", 150)]}
    for sid, lines in plan.items():
        for sku, _ in lines:
            find_or_create(f"{inv}/supplier-product/", {"supplier": sid, "product_variant": v[sku]["variant"]},
                           {"supplier": sid, "product_variant": v[sku]["variant"], "unit_cost": v[sku]["cost"],
                            "currency": "EGP", "effective_from": str(TODAY.replace(month=1, day=1)), "is_preferred": True})
    print("suppliers ok")

    # ---------- purchasing: PO -> approve -> receive -> matched invoice ----------
    invoices = {}
    for si in get_all(f"{inv}/supplier-invoice/"):  # a re-run reuses the purchase cycle already done
        sid = si["supplier"]["id"] if isinstance(si.get("supplier"), dict) else si.get("supplier")
        if sid in plan and str(si.get("invoice_number", "")).startswith("SUP-"):
            invoices[sid] = (si["id"], round(float(si["amount"]), 2))
    for sid, lines in plan.items():
        if sid in invoices:
            continue
        po = call("POST", f"{inv}/purchase-order/", {"supplier": sid, "warehouse": main_wh["id"], "currency": "EGP",
                                                    "expected_date": str(TODAY), "payment_terms": "Net 30"})
        po_lines = [call("POST", f"{inv}/purchase-order-line/", {"purchase_order": po["id"], "product_variant": v[s]["variant"],
                                                                "quantity_ordered": str(q), "unit_cost": v[s]["cost"], "tax_rate": "14"})
                    for s, q in lines]
        for step in ("submit", "approve", "send", "confirm", "ship"):
            po = action(f"{inv}/purchase-order/{po['id']}/action/", step)
        gr = call("POST", f"{inv}/goods-receipt/", {"purchase_order": po["id"], "warehouse": main_wh["id"],
                                                   "delivery_note": f"DLV-{po['id']:04d}", "is_complete": True})
        for pl, (_, q) in zip(po_lines, lines):
            call("POST", f"{inv}/goods-receipt-line/", {"goods_receipt": gr["id"], "po_line": pl["id"], "quantity_received": str(q)})
        action(f"{inv}/goods-receipt/{gr['id']}/action/", "post")
        po = call("GET", f"{inv}/purchase-order/{po['id']}/")
        amount = po.get("total_amount") or sum(float(v[s]["cost"]) * q * 1.14 for s, q in lines)
        si = call("POST", f"{inv}/supplier-invoice/", {"supplier": sid, "purchase_order": po["id"],
                                                      "invoice_number": f"SUP-{po['id']:04d}", "invoice_date": str(TODAY),
                                                      "due_date": str(TODAY + dt.timedelta(days=30)), "amount": f"{float(amount):.2f}", "currency": "EGP"})
        action(f"{inv}/supplier-invoice/{si['id']}/action/", "match", tolerance="5")
        invoices[sid] = (si["id"], round(float(amount), 2))
    print("purchasing ok")

    # ---------- accounting: pay the IT supplier, fiscal year, rent ----------
    sid, (inv_id, amount) = sup_it["id"], invoices[sup_it["id"]]
    call("POST", f"{acc}/supplier-payments/", {"supplier": sid, "amount": f"{amount:.2f}", "payment_method": "bank_transfer",
                                               "reference": "TRF-1043", "allocations": [{"invoice": inv_id, "amount": f"{amount:.2f}"}]})
    call("POST", f"{acc}/accounts/setup/", {})
    if not get_all(f"{acc}/fiscal-years/"):
        call("POST", f"{acc}/fiscal-years/", {"name": f"FY {TODAY.year}", "start_date": f"{TODAY.year}-01-01",
                                              "end_date": f"{TODAY.year}-12-31"})
    accounts = {a.get("code"): a["id"] for a in get_all(f"{acc}/accounts/")}
    call("POST", f"{acc}/journal-entries/", {"date": str(TODAY), "description": "Showroom rent - October", "reference": "RENT-10",
                                             "post": True, "lines": [{"account": accounts["6200"], "debit": "15000"},
                                                                     {"account": accounts["1110"], "credit": "15000"}]})
    print("accounting ok")

    # ---------- customers ----------
    addr = lambda street, city: {"street": street, "city": city, "state": "", "zip": "", "country": "Egypt"}
    cust = {}
    for name, ctype, limit, email, city in [
        ("Horizon Engineering", "business", "250000", "procurement@horizon-eng.example", "New Cairo"),
        ("Smart Schools Group", "business", "250000", "admin@smartschools.example", "6th of October"),
        ("Mostafa Adel", "individual", "50000", "mostafa.adel@example.com", "Nasr City"),
    ]:
        cust[name] = find_or_create(f"{sales}/customers/", {"name": name},
                                    {"name": name, "customer_type": ctype, "credit_limit": limit, "email": email,
                                     "phone": "+20 10 0000 0000", "payment_terms": "Net 30" if ctype == "business" else "Cash",
                                     "currency": "EGP", "billing_address": addr("Main St.", city), "shipping_address": addr("Main St.", city)})["id"]
    print("customers ok")

    def order(customer, lines, **kw):
        body = {"customer": cust[customer], "warehouse": main_wh["id"], "currency": "EGP", "priority": kw.get("priority", "normal"),
                "required_date": str(TODAY + dt.timedelta(days=7)), "shipping_cost": kw.get("shipping", "0"),
                "lines": [{"product": v[s]["product"], "variant": v[s]["variant"], "quantity_ordered": str(q),
                           "unit_price": v[s]["price"], "tax_percent": "14", "discount_percent": kw.get("discount", "0")} for s, q in lines]}
        return call("POST", f"{sales}/sales-orders/", body)

    def fulfil(so_id):
        so = call("GET", f"{sales}/sales-orders/{so_id}/")
        dn = call("POST", f"{sales}/sales-orders/{so_id}/create_delivery/",
                  {"lines": [{"line_id": l["id"], "quantity": l["quantity_ordered"]} for l in so["lines"]], "carrier": "Bosta"})
        dn_id = dn.get("id") or dn.get("delivery_note", {}).get("id")
        call("POST", f"{sales}/delivery-notes/{dn_id}/confirm_delivery/", {})
        call("POST", f"{sales}/delivery-notes/{dn_id}/ship/", {"carrier": "Bosta"})
        call("POST", f"{sales}/delivery-notes/{dn_id}/mark_delivered/", {})
        invoice = call("POST", f"{sales}/sales-invoices/create_from_order/", {"sales_order": so_id,
                                                                           "due_date": str(TODAY + dt.timedelta(days=30))})
        return call("POST", f"{sales}/sales-invoices/{invoice['id']}/issue/", {}), so

    # Horizon: delivered, invoiced, 60% paid by bank transfer
    so1 = order("Horizon Engineering", [("LAP-14-I5", 6), ("MOU-WL-01", 12)], priority="high", shipping="500")
    call("POST", f"{sales}/sales-orders/{so1['id']}/confirm/", {})
    inv1, so1 = fulfil(so1["id"])
    total1 = float(inv1.get("total_amount") or inv1.get("total"))
    call("POST", f"{sales}/sales-invoices/{inv1['id']}/pay/", {"amount": f"{round(total1 * 0.6, 2):.2f}",
                                                                "payment_method": "bank_transfer", "reference": "HZN-PAY-01"})
    # Smart Schools: delivered, invoiced, paid in full by cheque
    so2 = order("Smart Schools Group", [("CHR-ERG-01", 24), ("PAP-A4-5R", 60), ("TON-85A", 8)], discount="5")
    call("POST", f"{sales}/sales-orders/{so2['id']}/confirm/", {})
    inv2, _ = fulfil(so2["id"])
    call("POST", f"{sales}/sales-invoices/{inv2['id']}/pay/", {"amount": str(inv2.get("amount_due") or inv2.get("total_amount")),
                                                                "payment_method": "check", "reference": "CHQ-55821"})
    # Mostafa Adel: confirmed, waiting to ship; one more draft order
    so3 = order("Mostafa Adel", [("LAP-14-I5", 1), ("MOU-WL-01", 1)])
    call("POST", f"{sales}/sales-orders/{so3['id']}/confirm/", {})
    order("Horizon Engineering", [("TON-85A", 10), ("PAP-A4-5R", 20)])
    print("sales ok")

    # ---------- customer return: 2 mice, one restocked, one written off ----------
    mouse_line = next(l for l in so1["lines"] if str(l.get("variant")) == str(v["MOU-WL-01"]["variant"]) or l.get("sku") == "MOU-WL-01")
    rma = call("POST", f"{ret}/customer-returns/", {"sales_order": so1["id"], "customer": cust["Horizon Engineering"],
                                                    "warehouse": main_wh["id"], "return_reason": "defective",
                                                    "return_reason_note": "Two mice stopped working", "refund_method": "credit_note",
                                                    "lines": [{"sales_order_line": mouse_line["id"], "product": v["MOU-WL-01"]["product"],
                                                               "quantity_requested": "2"}]})
    call("POST", f"{ret}/customer-returns/{rma['id']}/approve/", {})
    rma = call("GET", f"{ret}/customer-returns/{rma['id']}/")
    line_id = rma["lines"][0]["id"]
    call("POST", f"{ret}/customer-returns/{rma['id']}/receive/", {"lines": [{"line_id": line_id, "quantity_received": "2"}]})
    rma = call("POST", f"{ret}/customer-returns/{rma['id']}/inspect/", {"lines": [{
        "line_id": line_id, "quantity_accepted": "2", "condition": "damaged", "restocking_decision": "write_off",
        "disposition": "reject", "defect_description": "Scroll wheel and sensor failure"}]})
    rma = call("GET", f"{ret}/customer-returns/{rma['id']}/")
    call("POST", f"{ret}/customer-returns/{rma['id']}/close/", {"refund_amount": str(rma.get("total_value") or "1026")})
    print("returns ok")
    print("done")


if __name__ == "__main__":
    main()
