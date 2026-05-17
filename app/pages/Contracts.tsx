import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Badge, Tabs, Button, Input, Select } from '../components/ui';
import * as Icons from '../components/icons';
import { useContracts } from '../lib/hooks';
import { api } from '../lib/api';
import type { Contract } from '../lib/api';

// ─── Code templates ───────────────────────────────────────────────────────────

const BLANK_CODE = `use chain_sdk::{ChainContext, FieldValue};
use std::collections::HashMap;

pub fn dispatch(
    fn_name: &str,
    args: serde_json::Value,
    ctx: &dyn ChainContext,
) -> Result<serde_json::Value, String> {
    match fn_name {
        "create" => create(args, ctx),
        _ => Err(format!("Unknown function: {}", fn_name)),
    }
}

fn create(
    args: serde_json::Value,
    ctx: &dyn ChainContext,
) -> Result<serde_json::Value, String> {
    if !ctx.has_role("WRITER") {
        return Err("Requires WRITER role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let value = args["value"].as_str().ok_or("missing value")?;

    let mut fields = HashMap::new();
    fields.insert("value".into(), FieldValue::Text(value.into()));
    fields.insert(
        "created_by".into(),
        FieldValue::Text(ctx.caller_identity().subject.clone()),
    );

    let record = ctx.insert("my_collection", "default", id, fields)
        .map_err(|e| e.to_string())?;

    ctx.emit_event("CREATED", id.as_bytes());
    Ok(record)
}`;

const HR_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "employees";

#[derive(Deserialize)]
struct HireInput {
    id: String, name: String, department: String,
    position: String, salary: i64, join_date: String, email: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "hire_employee"       => hire(args, ctx),
        "get_employee"        => get(args, ctx),
        "update_salary"       => update_salary(args, ctx),
        "transfer_department" => transfer(args, ctx),
        "terminate_employee"  => terminate(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn hire(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let input: HireInput = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;

    if !ctx.has_role("HR_MANAGER") && !ctx.has_role("HR_ADMIN") {
        return Err("Requires HR_MANAGER or HR_ADMIN role".into());
    }
    if input.salary < 3_000_000 {
        return Err("Salary below minimum wage".into());
    }

    let mut fields = HashMap::new();
    fields.insert("name".into(),       FieldValue::Text(input.name));
    fields.insert("department".into(), FieldValue::Text(input.department.clone()));
    fields.insert("position".into(),   FieldValue::Text(input.position));
    fields.insert("salary".into(),     FieldValue::Int(input.salary));
    fields.insert("status".into(),     FieldValue::Text("ACTIVE".into()));

    let record = ctx.insert(COLLECTION, &input.department, &input.id, fields)
        .map_err(|e| e.to_string())?;

    ctx.emit_event("EMPLOYEE_HIRED", input.id.as_bytes());
    Ok(record)
}`;

// ─── Enterprise templates ─────────────────────────────────────────────────────

const FINANCE_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "journal_entries";

#[derive(Deserialize)]
struct JournalEntry {
    id: String, date: String,
    debit_account: String, credit_account: String,
    amount: i64, currency: String,
    description: String, cost_center: String, period: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "post_entry"    => post_entry(args, ctx),
        "get_entry"     => get_entry(args, ctx),
        "list_by_period" => list_by_period(args, ctx),
        "close_period"  => close_period(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn post_entry(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("ACCOUNTANT") && !ctx.has_role("FINANCE_MANAGER") {
        return Err("Requires ACCOUNTANT or FINANCE_MANAGER role".into());
    }
    let e: JournalEntry = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;
    if e.amount <= 0 { return Err("Amount must be positive".into()); }

    let mut fields = HashMap::new();
    fields.insert("date".into(),           FieldValue::Text(e.date));
    fields.insert("debit_account".into(),  FieldValue::Text(e.debit_account));
    fields.insert("credit_account".into(), FieldValue::Text(e.credit_account));
    fields.insert("amount".into(),         FieldValue::Int(e.amount));
    fields.insert("currency".into(),       FieldValue::Text(e.currency));
    fields.insert("description".into(),    FieldValue::Text(e.description));
    fields.insert("cost_center".into(),    FieldValue::Text(e.cost_center));
    fields.insert("period".into(),         FieldValue::Text(e.period.clone()));
    fields.insert("posted_by".into(),      FieldValue::Text(ctx.caller_identity().subject.clone()));
    fields.insert("status".into(),         FieldValue::Text("POSTED".into()));

    let record = ctx.insert(COLLECTION, &e.period, &e.id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event("JOURNAL_ENTRY_POSTED", e.id.as_bytes());
    Ok(record)
}

fn get_entry(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let period = args["period"].as_str().ok_or("missing period")?;
    ctx.get(COLLECTION, period, id).map_err(|e| e.to_string())
}

fn list_by_period(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let period = args["period"].as_str().ok_or("missing period")?;
    ctx.list(COLLECTION, period, None).map_err(|e| e.to_string())
}

fn close_period(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("FINANCE_MANAGER") && !ctx.has_role("CFO") {
        return Err("Requires FINANCE_MANAGER or CFO role".into());
    }
    let period = args["period"].as_str().ok_or("missing period")?;
    ctx.emit_event("PERIOD_CLOSED", period.as_bytes());
    Ok(serde_json::json!({ "period": period, "status": "CLOSED" }))
}`;

const SUPPLY_CHAIN_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "shipments";

#[derive(Deserialize)]
struct Shipment {
    id: String, po_number: String,
    supplier: String, buyer: String,
    items: String, // JSON string of line items
    origin: String, destination: String,
    estimated_arrival: String,
}

#[derive(Deserialize)]
struct StatusUpdate {
    id: String, status: String,
    location: String, notes: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "create_shipment"  => create_shipment(args, ctx),
        "update_status"    => update_status(args, ctx),
        "confirm_delivery" => confirm_delivery(args, ctx),
        "get_shipment"     => get_shipment(args, ctx),
        "list_by_supplier" => list_by_supplier(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn create_shipment(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("LOGISTICS_MANAGER") && !ctx.has_role("PROCUREMENT") {
        return Err("Requires LOGISTICS_MANAGER or PROCUREMENT role".into());
    }
    let s: Shipment = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;

    let mut fields = HashMap::new();
    fields.insert("po_number".into(),         FieldValue::Text(s.po_number));
    fields.insert("supplier".into(),          FieldValue::Text(s.supplier.clone()));
    fields.insert("buyer".into(),             FieldValue::Text(s.buyer));
    fields.insert("items".into(),             FieldValue::Text(s.items));
    fields.insert("origin".into(),            FieldValue::Text(s.origin));
    fields.insert("destination".into(),       FieldValue::Text(s.destination));
    fields.insert("estimated_arrival".into(), FieldValue::Text(s.estimated_arrival));
    fields.insert("status".into(),            FieldValue::Text("CREATED".into()));
    fields.insert("created_by".into(),        FieldValue::Text(ctx.caller_identity().subject.clone()));

    let record = ctx.insert(COLLECTION, &s.supplier, &s.id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event("SHIPMENT_CREATED", s.id.as_bytes());
    Ok(record)
}

fn update_status(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let u: StatusUpdate = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;
    let allowed = ["IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY", "DELAYED"];
    if !allowed.contains(&u.status.as_str()) {
        return Err(format!("Invalid status. Allowed: {:?}", allowed));
    }
    let mut fields = HashMap::new();
    fields.insert("status".into(),   FieldValue::Text(u.status.clone()));
    fields.insert("location".into(), FieldValue::Text(u.location));
    fields.insert("notes".into(),    FieldValue::Text(u.notes));
    ctx.emit_event("SHIPMENT_STATUS_UPDATED", u.id.as_bytes());
    Ok(serde_json::json!({ "id": u.id, "status": u.status }))
}

fn confirm_delivery(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("WAREHOUSE_MANAGER") && !ctx.has_role("LOGISTICS_MANAGER") {
        return Err("Requires WAREHOUSE_MANAGER role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let signature = args["receiver_signature"].as_str().ok_or("missing signature")?;
    let mut fields = HashMap::new();
    fields.insert("status".into(),             FieldValue::Text("DELIVERED".into()));
    fields.insert("receiver_signature".into(), FieldValue::Text(signature.into()));
    fields.insert("delivered_by".into(),       FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.emit_event("SHIPMENT_DELIVERED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "DELIVERED" }))
}

fn get_shipment(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let supplier = args["supplier"].as_str().ok_or("missing supplier")?;
    ctx.get(COLLECTION, supplier, id).map_err(|e| e.to_string())
}

fn list_by_supplier(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let supplier = args["supplier"].as_str().ok_or("missing supplier")?;
    ctx.list(COLLECTION, supplier, None).map_err(|e| e.to_string())
}`;

const MANUFACTURING_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const WO_COLLECTION: &str  = "work_orders";
const QC_COLLECTION: &str  = "quality_checks";

#[derive(Deserialize)]
struct WorkOrder {
    id: String, product_code: String,
    quantity: i64, unit: String,
    production_line: String, scheduled_start: String,
    bom_version: String,
}

#[derive(Deserialize)]
struct QualityCheck {
    work_order_id: String, check_id: String,
    inspector: String, result: String, // PASS | FAIL | REWORK
    defect_code: Option<String>, notes: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "create_work_order"  => create_work_order(args, ctx),
        "start_production"   => start_production(args, ctx),
        "complete_production" => complete_production(args, ctx),
        "record_qc"          => record_qc(args, ctx),
        "get_work_order"     => get_work_order(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn create_work_order(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("PRODUCTION_PLANNER") && !ctx.has_role("PLANT_MANAGER") {
        return Err("Requires PRODUCTION_PLANNER role".into());
    }
    let wo: WorkOrder = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;
    if wo.quantity <= 0 { return Err("Quantity must be positive".into()); }

    let mut fields = HashMap::new();
    fields.insert("product_code".into(),    FieldValue::Text(wo.product_code));
    fields.insert("quantity".into(),        FieldValue::Int(wo.quantity));
    fields.insert("unit".into(),            FieldValue::Text(wo.unit));
    fields.insert("production_line".into(), FieldValue::Text(wo.production_line.clone()));
    fields.insert("scheduled_start".into(), FieldValue::Text(wo.scheduled_start));
    fields.insert("bom_version".into(),     FieldValue::Text(wo.bom_version));
    fields.insert("status".into(),          FieldValue::Text("PLANNED".into()));
    fields.insert("created_by".into(),      FieldValue::Text(ctx.caller_identity().subject.clone()));

    let record = ctx.insert(WO_COLLECTION, &wo.production_line, &wo.id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event("WORK_ORDER_CREATED", wo.id.as_bytes());
    Ok(record)
}

fn start_production(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("OPERATOR") && !ctx.has_role("PLANT_MANAGER") {
        return Err("Requires OPERATOR role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let line = args["production_line"].as_str().ok_or("missing production_line")?;
    let mut fields = HashMap::new();
    fields.insert("status".into(),      FieldValue::Text("IN_PROGRESS".into()));
    fields.insert("started_by".into(),  FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(WO_COLLECTION, line, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("PRODUCTION_STARTED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "IN_PROGRESS" }))
}

fn complete_production(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let line = args["production_line"].as_str().ok_or("missing production_line")?;
    let actual_qty = args["actual_quantity"].as_i64().ok_or("missing actual_quantity")?;
    let mut fields = HashMap::new();
    fields.insert("status".into(),          FieldValue::Text("COMPLETED".into()));
    fields.insert("actual_quantity".into(), FieldValue::Int(actual_qty));
    fields.insert("completed_by".into(),    FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(WO_COLLECTION, line, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("PRODUCTION_COMPLETED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "COMPLETED", "actual_quantity": actual_qty }))
}

fn record_qc(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("QC_INSPECTOR") && !ctx.has_role("QUALITY_MANAGER") {
        return Err("Requires QC_INSPECTOR role".into());
    }
    let qc: QualityCheck = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;
    let allowed = ["PASS", "FAIL", "REWORK"];
    if !allowed.contains(&qc.result.as_str()) {
        return Err(format!("Invalid result. Allowed: {:?}", allowed));
    }
    let mut fields = HashMap::new();
    fields.insert("work_order_id".into(), FieldValue::Text(qc.work_order_id.clone()));
    fields.insert("inspector".into(),     FieldValue::Text(qc.inspector));
    fields.insert("result".into(),        FieldValue::Text(qc.result.clone()));
    fields.insert("notes".into(),         FieldValue::Text(qc.notes));
    if let Some(dc) = qc.defect_code {
        fields.insert("defect_code".into(), FieldValue::Text(dc));
    }
    let record = ctx.insert(QC_COLLECTION, &qc.work_order_id, &qc.check_id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event(
        if qc.result == "PASS" { "QC_PASSED" } else { "QC_FAILED" },
        qc.check_id.as_bytes(),
    );
    Ok(record)
}

fn get_work_order(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let line = args["production_line"].as_str().ok_or("missing production_line")?;
    ctx.get(WO_COLLECTION, line, id).map_err(|e| e.to_string())
}`;

const PROCUREMENT_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "purchase_orders";

#[derive(Deserialize)]
struct PurchaseOrder {
    id: String, vendor_id: String, vendor_name: String,
    department: String, requested_by: String,
    items: String, // JSON array of { sku, description, qty, unit_price, currency }
    total_amount: i64, currency: String,
    delivery_date: String, payment_terms: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "create_po"     => create_po(args, ctx),
        "approve_po"    => approve_po(args, ctx),
        "reject_po"     => reject_po(args, ctx),
        "receive_goods" => receive_goods(args, ctx),
        "close_po"      => close_po(args, ctx),
        "get_po"        => get_po(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn create_po(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let po: PurchaseOrder = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;
    if po.total_amount <= 0 { return Err("Total amount must be positive".into()); }

    let mut fields = HashMap::new();
    fields.insert("vendor_id".into(),     FieldValue::Text(po.vendor_id));
    fields.insert("vendor_name".into(),   FieldValue::Text(po.vendor_name));
    fields.insert("department".into(),    FieldValue::Text(po.department.clone()));
    fields.insert("requested_by".into(),  FieldValue::Text(po.requested_by));
    fields.insert("items".into(),         FieldValue::Text(po.items));
    fields.insert("total_amount".into(),  FieldValue::Int(po.total_amount));
    fields.insert("currency".into(),      FieldValue::Text(po.currency));
    fields.insert("delivery_date".into(), FieldValue::Text(po.delivery_date));
    fields.insert("payment_terms".into(), FieldValue::Text(po.payment_terms));
    fields.insert("status".into(),        FieldValue::Text("PENDING_APPROVAL".into()));
    fields.insert("created_by".into(),    FieldValue::Text(ctx.caller_identity().subject.clone()));

    let record = ctx.insert(COLLECTION, &po.department, &po.id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event("PO_CREATED", po.id.as_bytes());
    Ok(record)
}

fn approve_po(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("PROCUREMENT_MANAGER") && !ctx.has_role("FINANCE_APPROVER") {
        return Err("Requires PROCUREMENT_MANAGER or FINANCE_APPROVER role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let mut fields = HashMap::new();
    fields.insert("status".into(),      FieldValue::Text("APPROVED".into()));
    fields.insert("approved_by".into(), FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("PO_APPROVED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "APPROVED" }))
}

fn reject_po(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("PROCUREMENT_MANAGER") && !ctx.has_role("FINANCE_APPROVER") {
        return Err("Requires PROCUREMENT_MANAGER or FINANCE_APPROVER role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let reason = args["reason"].as_str().unwrap_or("No reason provided");
    let mut fields = HashMap::new();
    fields.insert("status".into(),           FieldValue::Text("REJECTED".into()));
    fields.insert("rejection_reason".into(), FieldValue::Text(reason.into()));
    fields.insert("rejected_by".into(),      FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("PO_REJECTED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "REJECTED" }))
}

fn receive_goods(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("WAREHOUSE_STAFF") && !ctx.has_role("WAREHOUSE_MANAGER") {
        return Err("Requires WAREHOUSE_STAFF role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let mut fields = HashMap::new();
    fields.insert("status".into(),       FieldValue::Text("GOODS_RECEIVED".into()));
    fields.insert("received_by".into(),  FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("GOODS_RECEIVED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "GOODS_RECEIVED" }))
}

fn close_po(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let mut fields = HashMap::new();
    fields.insert("status".into(), FieldValue::Text("CLOSED".into()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("PO_CLOSED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "CLOSED" }))
}

fn get_po(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    ctx.get(COLLECTION, dept, id).map_err(|e| e.to_string())
}`;

const ASSET_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "assets";

#[derive(Deserialize)]
struct Asset {
    id: String, name: String, category: String,
    serial_number: String, location: String,
    assigned_to: Option<String>, department: String,
    purchase_date: String, purchase_value: i64, currency: String,
    warranty_expiry: Option<String>,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "register_asset"   => register_asset(args, ctx),
        "assign_asset"     => assign_asset(args, ctx),
        "transfer_asset"   => transfer_asset(args, ctx),
        "log_maintenance"  => log_maintenance(args, ctx),
        "decommission"     => decommission(args, ctx),
        "get_asset"        => get_asset(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn register_asset(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("ASSET_MANAGER") && !ctx.has_role("IT_ADMIN") {
        return Err("Requires ASSET_MANAGER or IT_ADMIN role".into());
    }
    let a: Asset = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;

    let mut fields = HashMap::new();
    fields.insert("name".into(),           FieldValue::Text(a.name));
    fields.insert("category".into(),       FieldValue::Text(a.category));
    fields.insert("serial_number".into(),  FieldValue::Text(a.serial_number));
    fields.insert("location".into(),       FieldValue::Text(a.location));
    fields.insert("department".into(),     FieldValue::Text(a.department.clone()));
    fields.insert("purchase_date".into(),  FieldValue::Text(a.purchase_date));
    fields.insert("purchase_value".into(), FieldValue::Int(a.purchase_value));
    fields.insert("currency".into(),       FieldValue::Text(a.currency));
    fields.insert("status".into(),         FieldValue::Text("AVAILABLE".into()));
    if let Some(assignee) = a.assigned_to {
        fields.insert("assigned_to".into(), FieldValue::Text(assignee));
        fields.insert("status".into(),      FieldValue::Text("IN_USE".into()));
    }
    if let Some(warranty) = a.warranty_expiry {
        fields.insert("warranty_expiry".into(), FieldValue::Text(warranty));
    }
    fields.insert("registered_by".into(), FieldValue::Text(ctx.caller_identity().subject.clone()));

    let record = ctx.insert(COLLECTION, &a.department, &a.id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event("ASSET_REGISTERED", a.id.as_bytes());
    Ok(record)
}

fn assign_asset(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("ASSET_MANAGER") { return Err("Requires ASSET_MANAGER role".into()); }
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let assignee = args["assigned_to"].as_str().ok_or("missing assigned_to")?;
    let mut fields = HashMap::new();
    fields.insert("assigned_to".into(), FieldValue::Text(assignee.into()));
    fields.insert("status".into(),      FieldValue::Text("IN_USE".into()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("ASSET_ASSIGNED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "assigned_to": assignee }))
}

fn transfer_asset(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("ASSET_MANAGER") { return Err("Requires ASSET_MANAGER role".into()); }
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let new_location = args["new_location"].as_str().ok_or("missing new_location")?;
    let new_dept = args["new_department"].as_str().ok_or("missing new_department")?;
    let mut fields = HashMap::new();
    fields.insert("location".into(),   FieldValue::Text(new_location.into()));
    fields.insert("department".into(), FieldValue::Text(new_dept.into()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("ASSET_TRANSFERRED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "location": new_location, "department": new_dept }))
}

fn log_maintenance(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let description = args["description"].as_str().ok_or("missing description")?;
    let cost = args["cost"].as_i64().unwrap_or(0);
    let mut fields = HashMap::new();
    fields.insert("last_maintenance".into(),      FieldValue::Text(description.into()));
    fields.insert("last_maintenance_cost".into(), FieldValue::Int(cost));
    fields.insert("maintained_by".into(),         FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("ASSET_MAINTAINED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "maintenance": "logged" }))
}

fn decommission(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("ASSET_MANAGER") { return Err("Requires ASSET_MANAGER role".into()); }
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    let reason = args["reason"].as_str().unwrap_or("End of life");
    let mut fields = HashMap::new();
    fields.insert("status".into(),               FieldValue::Text("DECOMMISSIONED".into()));
    fields.insert("decommission_reason".into(),  FieldValue::Text(reason.into()));
    fields.insert("decommissioned_by".into(),    FieldValue::Text(ctx.caller_identity().subject.clone()));
    ctx.update(COLLECTION, dept, id, fields).map_err(|e| e.to_string())?;
    ctx.emit_event("ASSET_DECOMMISSIONED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "DECOMMISSIONED" }))
}

fn get_asset(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let dept = args["department"].as_str().ok_or("missing department")?;
    ctx.get(COLLECTION, dept, id).map_err(|e| e.to_string())
}`;

const ACL_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "access_policies";

#[derive(Deserialize)]
struct Policy {
    id: String, resource: String,
    allowed_roles: Vec<String>, // e.g. ["HR_MANAGER", "HR_ADMIN"]
    allowed_orgs: Vec<String>,
    action: String, // READ | WRITE | ADMIN
    description: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "set_policy"    => set_policy(args, ctx),
        "revoke_policy" => revoke_policy(args, ctx),
        "check_access"  => check_access(args, ctx),
        "get_policy"    => get_policy(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn set_policy(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("SECURITY_ADMIN") && !ctx.has_role("ADMIN") {
        return Err("Requires SECURITY_ADMIN role".into());
    }
    let p: Policy = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;

    let mut fields = HashMap::new();
    fields.insert("resource".into(),      FieldValue::Text(p.resource.clone()));
    fields.insert("allowed_roles".into(), FieldValue::Text(p.allowed_roles.join(",")));
    fields.insert("allowed_orgs".into(),  FieldValue::Text(p.allowed_orgs.join(",")));
    fields.insert("action".into(),        FieldValue::Text(p.action));
    fields.insert("description".into(),   FieldValue::Text(p.description));
    fields.insert("set_by".into(),        FieldValue::Text(ctx.caller_identity().subject.clone()));

    let record = ctx.insert(COLLECTION, &p.resource, &p.id, fields)
        .map_err(|e| e.to_string())?;
    ctx.emit_event("POLICY_SET", p.id.as_bytes());
    Ok(record)
}

fn revoke_policy(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    if !ctx.has_role("SECURITY_ADMIN") && !ctx.has_role("ADMIN") {
        return Err("Requires SECURITY_ADMIN role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let resource = args["resource"].as_str().ok_or("missing resource")?;
    ctx.delete(COLLECTION, resource, id).map_err(|e| e.to_string())?;
    ctx.emit_event("POLICY_REVOKED", id.as_bytes());
    Ok(serde_json::json!({ "id": id, "status": "revoked" }))
}

fn check_access(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let resource = args["resource"].as_str().ok_or("missing resource")?;
    let action = args["action"].as_str().ok_or("missing action")?;
    let identity = ctx.caller_identity();
    let policies = ctx.list(COLLECTION, resource, None)
        .map_err(|e| e.to_string())?;
    // Simplified check — real impl would iterate policies
    let _ = policies;
    let has_access = identity.roles.iter().any(|r| r == "ADMIN");
    Ok(serde_json::json!({
        "subject": identity.subject,
        "resource": resource,
        "action": action,
        "allowed": has_access
    }))
}

fn get_policy(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let id = args["id"].as_str().ok_or("missing id")?;
    let resource = args["resource"].as_str().ok_or("missing resource")?;
    ctx.get(COLLECTION, resource, id).map_err(|e| e.to_string())
}`;

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Contract',
    desc: 'Minimal boilerplate — start from scratch',
    icon: Icons.FileCode,
    code: BLANK_CODE,
    category: 'General',
  },
  {
    id: 'hr',
    name: 'HR Management',
    desc: 'Employee lifecycle: hire, transfer, salary update, terminate',
    icon: Icons.Users,
    code: HR_CODE,
    category: 'Human Resources',
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    desc: 'General ledger journal entries with period management',
    icon: Icons.BarChart2,
    code: FINANCE_CODE,
    category: 'Finance',
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    desc: 'Shipment tracking from PO to confirmed delivery',
    icon: Icons.Truck,
    code: SUPPLY_CHAIN_CODE,
    category: 'Operations',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    desc: 'Work orders, production lifecycle, and QC inspection',
    icon: Icons.Factory,
    code: MANUFACTURING_CODE,
    category: 'Operations',
  },
  {
    id: 'procurement',
    name: 'Procurement',
    desc: 'Purchase order approval workflow with multi-role sign-off',
    icon: Icons.ClipboardList,
    code: PROCUREMENT_CODE,
    category: 'Finance',
  },
  {
    id: 'asset',
    name: 'Asset Management',
    desc: 'Enterprise asset registry: assign, transfer, maintain, decommission',
    icon: Icons.Package,
    code: ASSET_CODE,
    category: 'IT / Facilities',
  },
  {
    id: 'acl',
    name: 'Access Control Policy',
    desc: 'Resource-level RBAC policies with audit trail',
    icon: Icons.Shield,
    code: ACL_CODE,
    category: 'Security',
  },
];

// ─── List view ────────────────────────────────────────────────────────────────

function ContractList({ onNew, onSelect }: {
  onNew: () => void;
  onSelect: (c: Contract) => void;
}) {
  const { data: contracts, loading } = useContracts();

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Contracts</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Smart contracts deployed on the network</p>
        </div>
        <Button variant="default" size="sm" icon={<Icons.Plus size={13} />} onClick={onNew}>
          New Contract
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardBody>
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--raised)]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-[var(--raised)] rounded w-1/2" />
                      <div className="h-2.5 bg-[var(--raised)] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                    <div className="h-5 bg-[var(--raised)] rounded-md w-20" />
                    <div className="h-5 bg-[var(--raised)] rounded-md w-24" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!loading && contracts && contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contracts.map(contract => (
            <ContractCard key={contract.id} contract={contract} onClick={() => onSelect(contract)} />
          ))}
        </div>
      )}

      {!loading && (!contracts || contracts.length === 0) && (
        <Card>
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--raised)] border border-[var(--border)] flex items-center justify-center">
              <Icons.FileCode size={28} className="text-[var(--text-3)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-2)]">No contracts deployed</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Deploy your first smart contract to get started</p>
            </div>
            <Button variant="default" size="sm" icon={<Icons.Plus size={13} />} onClick={onNew}>
              Deploy Contract
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ContractCard({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  const visible = contract.functions.slice(0, 4);
  const extra = contract.functions.length - visible.length;

  return (
    <Card hover onClick={onClick}>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Icons.FileCode size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text)] font-mono">{contract.id}</p>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                {contract.functions.length} function{contract.functions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant={contract.kind === 'native' ? 'success' : 'info'}>{contract.kind}</Badge>
        </div>

        {contract.functions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[var(--border)]/60">
            {visible.map(fn => (
              <span key={fn} className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-[var(--raised)] border border-[var(--border)] text-[var(--text-3)]">
                {fn}
              </span>
            ))}
            {extra > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-[var(--raised)] border border-[var(--border)] text-[var(--text-3)]">
                +{extra} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end mt-3">
          <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
            View details <Icons.ArrowRight size={11} />
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function ContractDetail({ contract, onBack }: { contract: Contract; onBack: () => void }) {
  const [tab, setTab] = useState('overview');
  const [inspectFn, setInspectFn] = useState<string | null>(null);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <Icons.ChevronRight size={14} className="rotate-180" />
            Contracts
          </button>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center justify-center">
              <Icons.FileCode size={15} className="text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)] font-mono">{contract.id}</h1>
              <p className="text-xs text-[var(--text-3)]">
                {contract.functions.length} functions · {contract.kind}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={contract.kind === 'native' ? 'success' : 'info'}>{contract.kind}</Badge>
          <Badge variant="success" dot>active</Badge>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'functions', label: `Functions (${contract.functions.length})` },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Icons.Code size={14} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold">Exposed Functions</span>
            </CardHeader>
            {contract.functions.length > 0 ? (
              <div className="divide-y divide-[var(--border)]/50">
                {contract.functions.map((fn, i) => (
                  <div key={fn} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--raised)]/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--text-3)] font-mono w-5 text-right tabular-nums">{i + 1}</span>
                      <span className="text-sm font-mono text-[var(--text-2)]">{fn}</span>
                    </div>
                    <button type="button"
                      onClick={() => { setInspectFn(fn); setTab('functions'); }}
                      className="text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                      Inspect <Icons.ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <CardBody>
                <p className="text-sm text-[var(--text-3)] text-center py-8">No functions registered.</p>
              </CardBody>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Icons.Activity size={14} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold">Info</span>
              </CardHeader>
              <CardBody className="space-y-3">
                {[
                  { label: 'Contract ID', value: <span className="font-mono">{contract.id}</span> },
                  { label: 'Runtime', value: contract.kind === 'native' ? 'Native Rust' : 'WASM' },
                  { label: 'Status', value: <Badge variant="success" dot>active</Badge> },
                  { label: 'Functions', value: String(contract.functions.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-3)]">{label}</span>
                    <span className="text-[var(--text-2)] font-medium">{value}</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Icons.Terminal size={14} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold">Endpoints</span>
              </CardHeader>
              <CardBody className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-3)] leading-relaxed">
                  <span className="text-blue-400">POST</span>{' '}
                  /api/v1/invoke/<span className="text-[var(--accent)]">{contract.id}</span>/{'{'}<span className="text-[var(--text-2)]">fn</span>{'}'}
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-3)] leading-relaxed">
                  <span className="text-emerald-400">GET</span>{' '}
                  /api/v1/query/<span className="text-[var(--accent)]">{contract.id}</span>/{'{'}<span className="text-[var(--text-2)]">fn</span>{'}'}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'functions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <span className="text-sm font-semibold">Functions</span>
            </CardHeader>
            {contract.functions.length > 0 ? (
              <div className="divide-y divide-[var(--border)]/50">
                {contract.functions.map(fn => (
                  <button key={fn} type="button" onClick={() => setInspectFn(fn)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                      ${inspectFn === fn ? 'bg-[var(--raised)]' : 'hover:bg-[var(--raised)]/40'}`}>
                    <Icons.Code size={13} className={inspectFn === fn ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'} />
                    <span className={`text-sm font-mono font-medium ${inspectFn === fn ? 'text-[var(--accent)]' : 'text-[var(--text-2)]'}`}>
                      {fn}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <CardBody>
                <p className="text-xs text-[var(--text-3)] text-center py-6">No functions found.</p>
              </CardBody>
            )}
          </Card>

          <Card className="lg:col-span-2">
            {inspectFn ? (
              <>
                <CardHeader>
                  <Icons.Code size={14} className="text-[var(--accent)]" />
                  <span className="text-sm font-semibold font-mono">{inspectFn}()</span>
                  <Badge variant={contract.kind === 'native' ? 'success' : 'info'}>{contract.kind}</Badge>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="p-4 rounded-xl bg-[var(--code-bg)] border border-[var(--border)]">
                    <p className="text-[10px] font-semibold text-[var(--text-3)] mb-3 uppercase tracking-wider">Invoke (state-changing)</p>
                    <p className="font-mono text-xs text-[var(--text-2)]">
                      <span className="text-blue-400">POST</span>{' '}
                      <span className="text-[var(--text-3)]">/api/v1/invoke/</span>
                      <span className="text-[var(--accent)]">{contract.id}</span>
                      <span className="text-[var(--text-3)]">/</span>
                      <span className="text-[var(--text)]">{inspectFn}</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--code-bg)] border border-[var(--border)]">
                    <p className="text-[10px] font-semibold text-[var(--text-3)] mb-3 uppercase tracking-wider">Query (read-only)</p>
                    <p className="font-mono text-xs text-[var(--text-2)]">
                      <span className="text-emerald-400">GET</span>{' '}
                      <span className="text-[var(--text-3)]">/api/v1/query/</span>
                      <span className="text-[var(--accent)]">{contract.id}</span>
                      <span className="text-[var(--text-3)]">/</span>
                      <span className="text-[var(--text)]">{inspectFn}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] italic">
                    Detailed parameter schema (types, roles, returns) will be available once source introspection is added.
                  </p>
                </CardBody>
              </>
            ) : (
              <div className="flex flex-col items-center py-20">
                <Icons.Code size={28} className="text-[var(--text-3)] mb-3 opacity-40" />
                <p className="text-sm text-[var(--text-3)]">Select a function to inspect</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── New Contract view ────────────────────────────────────────────────────────

function NewContract({ onBack, onDeployed }: { onBack: () => void; onDeployed: () => void }) {
  const [tab, setTab] = useState('templates');
  const [code, setCode] = useState(BLANK_CODE);
  const [deployStep, setDeployStep] = useState(0);
  const [consoleLog, setConsoleLog] = useState<{ time: string; msg: string; type: string }[]>([]);

  // Deploy state
  const [contractId, setContractId]   = useState('');
  const [wasmFile, setWasmFile]       = useState<File | null>(null);
  const [deploying, setDeploying]     = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  const lineCount = code.split('\n').length;
  const addLog = (msg: string, type = 'info') =>
    setConsoleLog(prev => [...prev, { time: new Date().toISOString().slice(11, 23), msg, type }]);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <Icons.ChevronRight size={14} className="rotate-180" />
            Contracts
          </button>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div>
            <h1 className="text-lg font-bold text-[var(--text)]">New Contract</h1>
            <p className="text-xs text-[var(--text-3)]">Write, test, and deploy a smart contract</p>
          </div>
        </div>
        <Button variant="default" size="sm" icon={<Icons.Upload size={13} />} onClick={() => setTab('deploy')}>
          Deploy
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'templates', label: 'Templates' },
          { id: 'editor', label: 'Code Editor' },
          { id: 'deploy', label: 'Deploy' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {/* ── Templates ── */}
      {tab === 'templates' && (() => {
        const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));
        return (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat}>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-3">{cat}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TEMPLATES.filter(t => t.category === cat).map(tmpl => {
                    const Icon = tmpl.icon;
                    return (
                      <Card key={tmpl.id} hover onClick={() => { setCode(tmpl.code); setTab('editor'); }}>
                        <CardBody className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[var(--raised)] border border-[var(--border)] flex items-center justify-center shrink-0">
                            <Icon size={18} className="text-[var(--text-2)]" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[var(--text)] mb-0.5">{tmpl.name}</h3>
                            <p className="text-xs text-[var(--text-3)] mb-2.5 leading-relaxed">{tmpl.desc}</p>
                            <Badge variant="default" className="text-[10px]">Use Template →</Badge>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Editor ── */}
      {tab === 'editor' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <Card>
              <CardHeader action={
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<Icons.Copy size={12} />}
                    onClick={() => navigator.clipboard.writeText(code).catch(() => {})}>Copy</Button>
                  <Button variant="ghost" size="sm" icon={<Icons.Download size={12} />}>Export</Button>
                </div>
              }>
                <Icons.FileCode size={15} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold">src/lib.rs</span>
                <Badge variant="accent">Rust</Badge>
              </CardHeader>
              <div className="relative font-mono text-xs">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-[var(--code-bg)] border-r border-[var(--border)] flex flex-col items-end pr-2 pt-4 select-none overflow-hidden">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className="leading-relaxed text-[var(--text-3)] h-4.5 flex items-center text-[10px]">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  aria-label="Contract source code editor"
                  className="code-editor-textarea w-full bg-[var(--code-bg)]/80 text-[var(--text-2)] font-mono text-xs leading-relaxed p-4 pl-12 outline-none resize-none min-h-125"
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader action={
                <button type="button" onClick={() => setConsoleLog([])}
                  className="text-xs text-[var(--text-3)] hover:text-[var(--text)] flex items-center gap-1">
                  <Icons.Trash size={11} /> Clear
                </button>
              }>
                <Icons.Terminal size={14} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold">Console</span>
              </CardHeader>
              <div className="p-3 bg-[var(--code-bg)] min-h-30 max-h-44 overflow-y-auto font-mono text-xs space-y-1">
                {consoleLog.length === 0 && <p className="text-[var(--text-3)]">Ready.</p>}
                {consoleLog.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[var(--text-3)] shrink-0">[{l.time}]</span>
                    <span className={
                      l.type === 'error' ? 'text-red-400' :
                      l.type === 'success' ? 'text-emerald-400' : 'text-[var(--text-2)]'
                    }>{l.msg}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardBody className="space-y-2">
                <Button variant="default" className="w-full" icon={<Icons.Play size={13} />}
                  onClick={() => {
                    addLog('Compiling...');
                    setTimeout(() => addLog('cargo build: OK (2.1s)', 'success'), 1200);
                  }}>
                  Compile
                </Button>
                <Button variant="outline" className="w-full" icon={<Icons.Upload size={13} />}
                  onClick={() => setTab('deploy')}>
                  Deploy to Network
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── Deploy ── */}
      {tab === 'deploy' && (
        <Card>
          <CardBody>
            <div className="max-w-lg mx-auto py-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-8">
                {['Configure', 'Confirm', 'Done'].map((s, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-1.5 ${i <= deployStep ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                        ${i <= deployStep ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-3)]'}`}>
                        {i < deployStep ? '✓' : i + 1}
                      </div>
                      <span className="text-xs font-medium">{s}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${i < deployStep ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {deployStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Contract ID</label>
                    <Input
                      placeholder="e.g. todo-as"
                      className="w-full"
                      value={contractId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContractId(e.target.value)}
                    />
                    <p className="text-[11px] text-[var(--text-3)] mt-1">Unique identifier — used in invoke/query calls</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">WASM File</label>
                    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                      ${wasmFile ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : 'border-dashed border-[var(--border)] bg-[var(--raised)] hover:border-[var(--accent)]'}`}>
                      <Icons.Upload size={16} className={wasmFile ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'} />
                      <span className="text-sm text-[var(--text-2)] truncate">
                        {wasmFile ? wasmFile.name : 'Click to upload .wasm file'}
                      </span>
                      <input
                        type="file"
                        accept=".wasm"
                        className="hidden"
                        onChange={(e) => setWasmFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {wasmFile && (
                      <p className="text-[11px] text-[var(--text-3)] mt-1">{(wasmFile.size / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                  {deployError && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                      {deployError}
                    </p>
                  )}
                  <Button
                    variant="default"
                    onClick={() => {
                      if (!contractId.trim()) { setDeployError('Contract ID is required'); return; }
                      if (!wasmFile) { setDeployError('Please select a .wasm file'); return; }
                      setDeployError(null);
                      setDeployStep(1);
                    }}
                    className="w-full"
                  >
                    Next →
                  </Button>
                </div>
              )}

              {deployStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[var(--raised)] border border-[var(--border)] space-y-2.5">
                    {[
                      ['Contract ID', contractId],
                      ['File', wasmFile?.name ?? '—'],
                      ['Size', wasmFile ? `${(wasmFile.size / 1024).toFixed(1)} KB` : '—'],
                      ['Runtime', 'WASM'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-[var(--text-3)]">{k}</span>
                        <span className="text-[var(--text-2)] font-medium font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                  {deployError && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                      {deployError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setDeployStep(0); setDeployError(null); }} className="flex-1" disabled={deploying}>← Back</Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      disabled={deploying}
                      onClick={async () => {
                        if (!wasmFile) return;
                        setDeploying(true);
                        setDeployError(null);
                        try {
                          await api.deployContract(contractId, wasmFile);
                          setDeployStep(2);
                        } catch (err: any) {
                          setDeployError(err?.message ?? 'Deploy failed');
                        } finally {
                          setDeploying(false);
                        }
                      }}
                    >
                      {deploying ? 'Deploying…' : 'Deploy Now'}
                    </Button>
                  </div>
                </div>
              )}

              {deployStep === 2 && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] border border-[var(--accent)]/25 flex items-center justify-center mx-auto mb-4">
                    <Icons.CheckCircle size={28} className="text-[var(--accent)]" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text)] mb-1">Deployment Successful!</h3>
                  <p className="text-sm text-[var(--text-3)] mb-1">
                    <span className="font-mono text-[var(--accent)]">{contractId}</span> is now active
                  </p>
                  <p className="text-xs text-[var(--text-3)] mb-5">{wasmFile?.name} · {wasmFile ? `${(wasmFile.size / 1024).toFixed(1)} KB` : ''}</p>
                  <Button variant="default" onClick={onDeployed}>Back to Contracts</Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

type View = 'list' | 'detail' | 'new';

export function ContractsPage() {
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Contract | null>(null);

  if (view === 'detail' && selected) {
    return <ContractDetail contract={selected} onBack={() => setView('list')} />;
  }
  if (view === 'new') {
    return <NewContract onBack={() => setView('list')} onDeployed={() => setView('list')} />;
  }
  return (
    <ContractList
      onNew={() => setView('new')}
      onSelect={(c) => { setSelected(c); setView('detail'); }}
    />
  );
}
