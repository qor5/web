import Vue from "vue";

export default Vue.extend({
	template: `
		<div>
		<slot :locals="locals" :plaidForm="plaidForm"></slot>
		</div>`,

	props: {
		init: Object
	},
	data() {
		return {
			locals: {},
			plaidForm: new FormData(),
		}
	},
	created() {
		if (!this.init) {
			return
		}
		Object.keys(this.init).forEach((k) => {
			// console.log(k, this.init[k])
			this.$set(this.locals, k, this.init[k]);
		});
	},
})
