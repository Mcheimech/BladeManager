<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="BladeWithForm.aspx.cs" Inherits="BladeManager.Demo.Ajax.BladeWithForm" %>
<%var uid = Guid.NewGuid().ToString().Replace("-", ""); %>
<div id="<%=uid%>">
    <%if (Request.Form["firstName"] != null)
        { %>
        <h4>Submitted data:</h4>
    <div>
        <label>First Name:</label>
        <%=Request.Form["firstName"]%>
    </div>
    <div>
        <label>Last Name:</label>
        <%=Request.Form["lastName"]%>
    </div>
    <div>
        <label>Address:</label>
        <%=Request.Form["address"]%>
    </div>
    <%} %>
    <form method="post" runat="server">
        <div class="form-group">
            <label class="form-label col-md-12">First Name</label>
            <div class="col-md-12">
                <input type="text" class="form-control" name="firstName" />
            </div>
        </div>
        <div class="form-group">
            <label class="form-label col-md-12">Last Name</label>
            <div class="col-md-12">
                <input type="text" class="form-control" name="lastName" />
            </div>
        </div>
        <div class="form-group">
            <label class="form-label col-md-12">Address</label>
            <div class="col-md-12">
                <input type="text" class="form-control" name="address" />
            </div>
        </div>

        <div class="form-group" style="display:none;">
            <div class="col-md-12">
                <asp:button runat="server" id="btnSave" text="Save" cssclass="btn btn-sm btn-outline-primary" OnClick="btnSave_Click" />
            </div>
        </div>
    </form>
</div>
<script>
    bladeManager.setSettings({
        toolbar: {
            buttons: [
                {
                    text: 'Save',
                    icon: 'md-save',
                    callback: function (blade, bladeForm) {
                        var hfButton = document.createElement('input');
                        hfButton.type = 'hidden';
                        hfButton.name = 'btnSave';
                        hfButton.value = 'Save';

                        bladeForm.append(hfButton);

                        bladeForm.submit();
                    }
                }
            ]
        }
    }, bladeManager.resolveBlade('<%=uid%>'));
</script>