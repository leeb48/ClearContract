/// <reference path="../pb_data/types.d.ts" />
// Every user gets a business_settings row at registration (plan §6 Phase 1).
// Defaults here, not in the schema, so they live in one reviewable place.
onRecordAfterCreateSuccess((e) => {
	const collection = e.app.findCollectionByNameOrId('business_settings');
	const settings = new Record(collection);
	settings.set('user', e.record.id);
	settings.set('brand_color', '#4881A0');
	settings.set('quote_prefix', 'TF');
	settings.set('next_quote_number', 1);
	settings.set('next_invoice_number', 1);
	settings.set('default_tax_rate', 0);
	settings.set('collects_sales_tax', false);
	settings.set('greeting_enabled', true);
	settings.set('currency', 'USD');
	e.app.save(settings);

	e.next();
}, 'users');
