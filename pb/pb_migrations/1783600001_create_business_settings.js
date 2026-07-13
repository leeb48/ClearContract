/// <reference path="../pb_data/types.d.ts" />
// business_settings — 1:1 with user, owner-only access (plan §3.2).
migrate(
	(app) => {
		const ownerRule = 'user = @request.auth.id';
		const collection = new Collection({
			name: 'business_settings',
			type: 'base',
			listRule: ownerRule,
			viewRule: ownerRule,
			createRule: ownerRule,
			updateRule: ownerRule,
			deleteRule: ownerRule,
			indexes: ['CREATE UNIQUE INDEX `idx_business_settings_user` ON `business_settings` (`user`)'],
			fields: [
				{
					type: 'relation',
					name: 'user',
					required: true,
					collectionId: '_pb_users_auth_',
					maxSelect: 1,
					cascadeDelete: true,
				},
				{ type: 'text', name: 'company_name', max: 120 },
				{ type: 'text', name: 'business_address', max: 500 },
				{
					type: 'file',
					name: 'logo',
					maxSelect: 1,
					maxSize: 5242880,
					mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
					thumbs: ['600x0'],
				},
				{ type: 'text', name: 'brand_color', max: 9 },
				{ type: 'text', name: 'quote_prefix', max: 8 },
				{ type: 'number', name: 'next_quote_number', onlyInt: true, min: 1 },
				{ type: 'number', name: 'next_invoice_number', onlyInt: true, min: 1 },
				{ type: 'number', name: 'default_tax_rate', min: 0, max: 100 },
				{ type: 'bool', name: 'collects_sales_tax' },
				{
					type: 'file',
					name: 'terms_pdf',
					maxSelect: 1,
					maxSize: 10485760,
					mimeTypes: ['application/pdf'],
				},
				{ type: 'text', name: 'terms_text', max: 50000 },
				{ type: 'bool', name: 'greeting_enabled' },
				{ type: 'text', name: 'currency', max: 3 },
				{ type: 'autodate', name: 'created', onCreate: true },
				{ type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
			],
		});
		app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('business_settings');
		app.delete(collection);
	},
);
