<script setup>
import { ref } from 'vue'
const props = defineProps({
    cancelBtn: {
        type: String,
        default: "Cancel",
    },
    confirmationBtn: {
        type: String,
        default: "Confirm",
    },
    title: {
        type: String,
        default: "Confirmation",
    },
    msg: {
        type: String,
        default: "",
    }
})

const emit = defineEmits(["show", "hide", "confirmed"])

const hiddenButtonToShowDialog = ref(null)
const hiddenButtonToHideDialog = ref(null)

const show = () => {
    hiddenButtonToShowDialog.value.click()
    emit("show")
}
const hide = () => {
    hiddenButtonToHideDialog.value.click()
    emit("hide")
}
const clickConfirm = () => {
    hide()
    emit("confirmed")
}

defineExpose({ show, hide })
</script>


<template>
    <button ref="hiddenButtonToShowDialog" type="button" class="d-none" data-bs-toggle="modal"
        data-bs-target="#confirmationModalId"></button>

    <div class="modal fade" id="confirmationModalId" tabindex="-1" aria-labelledby="confirmationModalLabel"
        aria-hidden="true">
        <div class="modal-dialog bg">
            <button ref="hiddenButtonToHideDialog" type="button" class="d-none" data-bs-dismiss="modal"></button>

            <div class="modal-content bg-dark">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmationModalLabel">{{ title }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    {{ msg }}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        {{ cancelBtn }}
                    </button>
                    <button type="button" class="btn btn-danger" @click="clickConfirm">
                        {{ confirmationBtn }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
