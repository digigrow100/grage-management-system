import assert from 'node:assert/strict';
import {test} from 'node:test';
import {accountingTotals, invoicePaymentTotals, invoiceTotals} from '../src/lib/totals.ts';
const invoice={status:'sent',jobId:'job',vatRate:20,lineItems:[{quantity:1,unitPrice:100}],payments:[{amount:60}]};
const job={id:'job',partLines:[{quantity:2,costPrice:10,unitPrice:30}]};
test('partial payment excludes VAT and recognises proportional historical cost',()=>{
 assert.deepEqual(invoicePaymentTotals(invoice),{received:60,balance:60,legacyPaid:false});
 assert.deepEqual(accountingTotals([invoice],[job],5),{revenue:50,vat:10,outstanding:60,partsCost:10,grossProfit:40,expenses:5,netProfit:35});
});
test('legacy paid invoices preserve their paid state without invented payment data',()=>{
 assert.deepEqual(invoicePaymentTotals({...invoice,status:'paid',payments:[]}),{received:120,balance:0,legacyPaid:true});
});
test('estimates do not contribute to revenue or outstanding invoices',()=>{
 assert.equal(accountingTotals([{...invoice,status:'estimate'}],[job],0).revenue,0);
 assert.equal(accountingTotals([{...invoice,status:'estimate'}],[job],0).outstanding,0);
});
test('invoice total rounds consistently with the payment database calculation',()=>{
 assert.deepEqual(invoiceTotals({...invoice,lineItems:[{quantity:0.03,unitPrice:44.5}]}),{subtotal:1.34,vat:0.26,total:1.6});
});
