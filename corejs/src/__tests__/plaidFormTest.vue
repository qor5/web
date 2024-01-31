<template>
  <go-plaid-scope v-slot="{ plaidForm, locals }" :init="{ value: '222' }">
    <div>{{ locals.value }}</div>
    <input v-field-name="[plaidForm, 'Age']" :value="locals.value" type="text" />
    <input v-field-name="[plaidForm, 'Company']" :value="'The Plant'" type="text" />
    <go-plaid-portal :portal-form="plaidForm" :portal-name="'portalA'" :visible="true">
      <input v-field-name="[plaidForm, 'Name']" :value="locals.value" type="text" />
    </go-plaid-portal>
  </go-plaid-scope>
</template>

<script>
export default {
  provide() {
    return {
      vars: {}
    }
  }
}
</script>
