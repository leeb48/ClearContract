/// <reference path="../pb_data/types.d.ts" />
// customers — owner-only CRM records (plan §3.5).
migrate(
	(app) => {
		const ownerRule = 'user = @request.auth.id';
		const collection = new Collection({
			name: 'customers',
			type: 'base',
			listRule: ownerRule,
			viewRule: ownerRule,
			createRule: ownerRule,
			updateRule: ownerRule,
			deleteRule: ownerRule,
			indexes: ['CREATE INDEX `idx_customers_user_name` ON `customers` (`user`, `name`)'],
			fields: [
				{
					type: 'relation',
					name: 'user',
					required: true,
					collectionId: '_pb_users_auth_',
					maxSelect: 1,
					cascadeDelete: true,
				},
				{ type: 'text', name: 'name', required: true, max: 120 },
				{ type: 'email', name: 'email' },
				{ type: 'text', name: 'phone', max: 30 },
				{ type: 'text', name: 'address', max: 500 },
				{ type: 'text', name: 'notes', max: 2000 },
				{ type: 'autodate', name: 'created', onCreate: true },
				{ type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
			],
		});
		app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('customers');
		app.delete(collection);
	},
);
